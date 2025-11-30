use anyhow::{Context, anyhow};
use async_timing_util::unix_timestamp_ms;
use database::{
  hash_password,
  mungos::mongodb::bson::{Document, doc},
};
use komodo_client::{
  api::auth::{
    LoginLocalUser, LoginLocalUserResponse, SignUpLocalUser,
    SignUpLocalUserResponse,
  },
  entities::user::{User, UserConfig},
};
use rate_limit::WithFailureRateLimit;
use reqwest::StatusCode;
use resolver_api::Resolve;
use serror::AddStatusCode as _;

use crate::{
  api::auth::AuthArgs,
  config::core_config,
  helpers::validations::{validate_password, validate_username},
  state::{auth_rate_limiter, db_client, jwt_client},
};

impl Resolve<AuthArgs> for SignUpLocalUser {
  #[instrument("SignUpLocalUser", skip(self))]
  async fn resolve(
    self,
    AuthArgs { headers }: &AuthArgs,
  ) -> serror::Result<SignUpLocalUserResponse> {
    sign_up_local_user(self)
      .with_failure_rate_limit_using_headers(
        auth_rate_limiter(),
        headers,
      )
      .await
  }
}

async fn sign_up_local_user(
  req: SignUpLocalUser,
) -> serror::Result<SignUpLocalUserResponse> {
  let config = core_config();

  if !config.local_auth {
    return Err(anyhow!("Local auth is not enabled").into());
  }

  validate_username(&req.username)
    .status_code(StatusCode::BAD_REQUEST)?;
  validate_password(&req.password)
    .status_code(StatusCode::BAD_REQUEST)?;

  let db = db_client();

  let no_users_exist =
    db.users.find_one(Document::new()).await?.is_none();

  if !no_users_exist && config.disable_user_registration {
    return Err(anyhow!("User registration is disabled").into());
  }

  if db
    .users
    .find_one(doc! { "username": &req.username })
    .await
    .context("Failed to query for existing users")?
    .is_some()
  {
    return Err(anyhow!("Username already taken.").into());
  }

  let ts = unix_timestamp_ms() as i64;
  let hashed_password = hash_password(req.password)?;

  let user = User {
    id: Default::default(),
    username: req.username,
    enabled: no_users_exist || config.enable_new_users,
    admin: no_users_exist,
    super_admin: no_users_exist,
    create_server_permissions: no_users_exist,
    create_build_permissions: no_users_exist,
    updated_at: ts,
    last_update_view: 0,
    recents: Default::default(),
    all: Default::default(),
    config: UserConfig::Local {
      password: hashed_password,
    },
  };

  let user_id = db_client()
    .users
    .insert_one(user)
    .await
    .context("Failed to create user on database")?
    .inserted_id
    .as_object_id()
    .context("The 'inserted_id' is not ObjectId")?
    .to_string();

  jwt_client()
    .encode(user_id)
    .context("Failed to generate JWT for user")
    .map_err(Into::into)
}

impl Resolve<AuthArgs> for LoginLocalUser {
  async fn resolve(
    self,
    AuthArgs { headers }: &AuthArgs,
  ) -> serror::Result<LoginLocalUserResponse> {
    login_local_user(self)
      .with_failure_rate_limit_using_headers(
        auth_rate_limiter(),
        headers,
      )
      .await
  }
}

async fn login_local_user(
  req: LoginLocalUser,
) -> serror::Result<LoginLocalUserResponse> {
  if !core_config().local_auth {
    return Err(anyhow!("Local auth is not enabled").into());
  }

  validate_username(&req.username)
    .status_code(StatusCode::BAD_REQUEST)?;

  let user = db_client()
    .users
    .find_one(doc! { "username": &req.username })
    .await
    .context("failed at db query for users")?
    .with_context(|| {
      format!("did not find user with username {}", req.username)
    })?;

  let UserConfig::Local {
    password: user_pw_hash,
  } = user.config
  else {
    return Err(
      anyhow!("Non-local auth users can not log in with a password")
        .into(),
    );
  };

  let verified = bcrypt::verify(req.password, &user_pw_hash)
    .context("failed at verify password")?;

  if !verified {
    return Err(anyhow!("invalid credentials").into());
  }

  jwt_client()
    .encode(user.id)
    .context("Failed to generate JWT for user")
    .map_err(Into::into)
}
