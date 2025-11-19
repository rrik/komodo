import { RequiredResourceComponents, UsableResource } from "@types";
import { SwarmComponents } from "./swarm";
import { ServerComponents } from "./server";
import { StackComponents } from "./stack";
import { DeploymentComponents } from "./deployment";
import { BuildComponents } from "./build";
import { RepoComponents } from "./repo";
import { ProcedureComponents } from "./procedure/index";
import { ActionComponents } from "./action";
import { BuilderComponents } from "./builder";
import { AlerterComponents } from "./alerter";
import { ResourceSyncComponents } from "./sync";

export const ResourceComponents: {
  [key in UsableResource]: RequiredResourceComponents;
} = {
  Swarm: SwarmComponents,
  Server: ServerComponents,
  Stack: StackComponents,
  Deployment: DeploymentComponents,
  Build: BuildComponents,
  Repo: RepoComponents,
  Procedure: ProcedureComponents,
  Action: ActionComponents,
  ResourceSync: ResourceSyncComponents,
  Builder: BuilderComponents,
  Alerter: AlerterComponents,
};
