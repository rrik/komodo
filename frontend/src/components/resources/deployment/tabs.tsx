import { ConnectExecQuery, Types } from "komodo_client";
import { useDeployment } from ".";
import { useLocalStorage, usePermissions } from "@lib/hooks";
import { useServer } from "../server";
import { useMemo } from "react";
import {
  MobileFriendlyTabsSelector,
  TabNoContent,
} from "@ui/mobile-friendly-tabs";
import { DeploymentConfig } from "./config";
import { DeploymentLogs } from "./log";
import { DeploymentInspect } from "./inspect";
import { ContainerTerminal } from "@components/terminal/container";

export const DeploymentTabs = ({ id }: { id: string }) => {
  const deployment = useDeployment(id);
  if (!deployment) return null;
  return <DeploymentTabsInner deployment={deployment} />;
};

type DeploymentTabsView = "Config" | "Log" | "Inspect" | "Terminal";

const DeploymentTabsInner = ({
  deployment,
}: {
  deployment: Types.DeploymentListItem;
}) => {
  const [_view, setView] = useLocalStorage<DeploymentTabsView>(
    "deployment-tabs-v1",
    "Config"
  );
  const { specificLogs, specificInspect, specificTerminal } = usePermissions({
    type: "Deployment",
    id: deployment.id,
  });
  const container_terminals_disabled =
    useServer(deployment.info.server_id)?.info.container_terminals_disabled ??
    true;
  const state = deployment.info.state;
  const logsDisabled =
    !specificLogs ||
    state === undefined ||
    state === Types.DeploymentState.Unknown ||
    state === Types.DeploymentState.NotDeployed;
  const inspectDisabled =
    !specificInspect ||
    state === undefined ||
    state === Types.DeploymentState.Unknown ||
    state === Types.DeploymentState.NotDeployed;
  const terminalDisabled =
    !specificTerminal ||
    container_terminals_disabled ||
    state !== Types.DeploymentState.Running;
  const view =
    (logsDisabled && _view === "Log") ||
    (inspectDisabled && _view === "Inspect") ||
    (terminalDisabled && _view === "Terminal")
      ? "Config"
      : _view;

  const tabsNoContent = useMemo<TabNoContent<DeploymentTabsView>[]>(
    () => [
      {
        value: "Config",
      },
      {
        value: "Log",
        hidden: !specificLogs,
        disabled: logsDisabled,
      },
      {
        value: "Inspect",
        hidden: !specificInspect,
        disabled: inspectDisabled,
      },
      {
        value: "Terminal",
        hidden: !specificTerminal,
        disabled: terminalDisabled,
      },
    ],
    [
      specificLogs,
      logsDisabled,
      specificInspect,
      inspectDisabled,
      specificTerminal,
      terminalDisabled,
    ]
  );

  const Selector = (
    <MobileFriendlyTabsSelector
      tabs={tabsNoContent}
      value={view}
      onValueChange={setView as any}
      tabsTriggerClassname="w-[110px]"
    />
  );

  const terminalQuery = useMemo(
    () =>
      ({
        type: "deployment",
        query: {
          deployment: deployment.id,
          // This is handled inside ContainerTerminal
          shell: "",
        },
      }) as ConnectExecQuery,
    [deployment.id]
  );

  switch (view) {
    case "Config":
      return <DeploymentConfig id={deployment.id} titleOther={Selector} />;
    case "Log":
      return <DeploymentLogs id={deployment.id} titleOther={Selector} />;
    case "Inspect":
      return <DeploymentInspect id={deployment.id} titleOther={Selector} />;
    case "Terminal":
      return <ContainerTerminal query={terminalQuery} titleOther={Selector} />;
  }
};
