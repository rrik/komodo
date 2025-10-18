import { lazy } from "react";
import { useRead, useSettingsView, useUser } from "@lib/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs";
import { Page } from "@components/layouts";
import { ExportButton } from "@components/export";
import { Variables } from "./variables";
import { Tags } from "./tags";
import { UsersPage } from "./users";
import { Profile } from "./profile";
import { ProvidersPage } from "./providers";
import { Onboarding } from "./onboarding";
import { Input } from "@ui/input";
import { CopyButton } from "@components/util";

const Resources = lazy(() => import("@pages/resources"));

export default function Settings() {
  const user = useUser().data;
  const [view, setView] = useSettingsView();
  const info = useRead("GetCoreInfo", {}).data;
  const currentView =
    (view === "Users" || view === "Providers") && !user?.admin
      ? "Variables"
      : view;
  return (
    <Page>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="font-mono bg-secondary px-2 py-1 rounded-md">
            {info?.title}
          </div>
          |
          <div className="flex gap-3 items-center justify-between">
            Public Key
            <Input
              className="w-72 bg-secondary"
              value={info?.public_key}
              disabled
            />
            <CopyButton content={info?.public_key} />
          </div>
        </div>
        <Tabs
          value={currentView}
          onValueChange={setView as any}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center justify-between">
            <TabsList className="justify-start w-fit">
              <TabsTrigger value="Variables">Variables</TabsTrigger>
              <TabsTrigger value="Tags">Tags</TabsTrigger>
              <TabsTrigger value="Builders">Builders</TabsTrigger>
              <TabsTrigger value="Alerters">Alerters</TabsTrigger>
              {user?.admin && (
                <TabsTrigger value="Providers">Providers</TabsTrigger>
              )}
              {user?.admin && <TabsTrigger value="Users">Users</TabsTrigger>}
              <TabsTrigger value="Profile">Profile</TabsTrigger>
              {user?.admin && (
                <TabsTrigger value="Onboarding">Onboarding</TabsTrigger>
              )}
            </TabsList>

            {currentView === "Variables" && <ExportButton include_variables />}
          </div>

          <TabsContent value="Variables">
            <Variables />
          </TabsContent>
          <TabsContent value="Tags">
            <Tags />
          </TabsContent>
          <TabsContent value="Builders">
            <Resources _type="Builder" />
          </TabsContent>
          <TabsContent value="Alerters">
            <Resources _type="Alerter" />
          </TabsContent>
          {user?.admin && (
            <TabsContent value="Providers">
              <ProvidersPage />
            </TabsContent>
          )}
          {user?.admin && (
            <TabsContent value="Users">
              <UsersPage goToProfile={() => setView("Profile")} />
            </TabsContent>
          )}
          <TabsContent value="Profile">
            <Profile />
          </TabsContent>
          <TabsContent value="Onboarding">
            <Onboarding />
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}
