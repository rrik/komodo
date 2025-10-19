import { lazy } from "react";
import { useSettingsView, useUser } from "@lib/hooks";
import { Page } from "@components/layouts";
import { ExportButton } from "@components/export";
import { Variables } from "./variables";
import { Tags } from "./tags";
import { UsersPage } from "./users";
import { Profile } from "./profile";
import { ProvidersPage } from "./providers";
import { Onboarding } from "./onboarding";
import { CoreInfo } from "./core-info";
import { MobileFriendlyTabs } from "@ui/mobile-friendly-tabs";

const Resources = lazy(() => import("@pages/resources"));

export default function Settings() {
  const user = useUser().data;
  const [view, setView] = useSettingsView();
  const currentView =
    (view === "Users" || view === "Providers") && !user?.admin
      ? "Variables"
      : view;
  return (
    <Page>
      <div className="flex flex-col gap-5">
        <CoreInfo />
        <MobileFriendlyTabs
          tabs={[
            {
              value: "Variables",
              content: <Variables />,
            },
            {
              value: "Tags",
              content: <Tags />,
            },
            {
              value: "Builders",
              content: <Resources _type="Builder" />,
            },
            {
              value: "Alerters",
              content: <Resources _type="Alerter" />,
            },
            {
              value: "Providers",
              content: <ProvidersPage />,
              hidden: !user?.admin,
            },
            {
              value: "Users",
              content: <UsersPage goToProfile={() => setView("Profile")} />,
              hidden: !user?.admin,
            },
            {
              value: "Profile",
              content: <Profile />,
            },
            {
              value: "Onboarding",
              content: <Onboarding />,
              hidden: !user?.admin,
            },
          ]}
          actions={
            currentView === "Variables" && <ExportButton include_variables />
          }
          value={currentView}
          onValueChange={setView as any}
        />
      </div>
    </Page>
  );
}
