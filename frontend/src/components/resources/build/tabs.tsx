import { useLocalStorage, useRead } from "@lib/hooks";
import {
  MobileFriendlyTabsSelector,
  TabNoContent,
} from "@ui/mobile-friendly-tabs";
import { useMemo } from "react";
import { BuildInfo } from "./info";
import { Section } from "@components/layouts";
import { ResourceComponents } from "..";
import { DeploymentTable } from "../deployment/table";
import { BuildConfig } from "./config";

type BuildTabsView = "Config" | "Info" | "Deployments";

export const BuildTabs = ({ id }: { id: string }) => {
  const [view, setView] = useLocalStorage<BuildTabsView>(
    "build-tabs-v1",
    "Config"
  );
  const deployments = useRead("ListDeployments", {}).data?.filter(
    (deployment) => deployment.info.build_id === id
  );
  const deploymentsDisabled = (deployments?.length || 0) === 0;

  const tabsNoContent = useMemo<TabNoContent<BuildTabsView>[]>(
    () => [
      {
        value: "Config",
      },
      {
        value: "Info",
      },
      {
        value: "Deployments",
        disabled: deploymentsDisabled,
      },
    ],
    [deploymentsDisabled]
  );

  const Selector = (
    <MobileFriendlyTabsSelector
      tabs={tabsNoContent}
      value={view}
      onValueChange={setView as any}
      tabsTriggerClassname="w-[110px]"
    />
  );

  switch (view) {
    case "Config":
      return <BuildConfig id={id} titleOther={Selector} />;
    case "Info":
      return <BuildInfo id={id} titleOther={Selector} />;
    case "Deployments":
      return (
        <Section
          titleOther={Selector}
          actions={<ResourceComponents.Deployment.New build_id={id} />}
        >
          <DeploymentTable deployments={deployments ?? []} />
        </Section>
      );
  }
};
