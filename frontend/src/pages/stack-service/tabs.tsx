import { useServer } from "@components/resources/server";
import { ContainerTerminals } from "@components/terminal/container";
import { useLocalStorage, usePermissions } from "@lib/hooks";
import { MobileFriendlyTabsSelector } from "@ui/mobile-friendly-tabs";
import { Types } from "komodo_client";
import { useMemo } from "react";
import { StackServiceInspect } from "./inspect";
import { StackServiceLogs } from "./log";

type StackServiceTabsView = "Log" | "Inspect" | "Terminals";

export const StackServiceTabs = ({
  stack,
  service,
  container_state,
}: {
  stack: Types.StackListItem;
  service: string;
  container_state: Types.ContainerStateStatusEnum;
}) => {
  const [_view, setView] = useLocalStorage<StackServiceTabsView>(
    `stack-${stack.id}-${service}-tabs-v2`,
    "Log"
  );
  const { specificLogs, specificInspect, specificTerminal } = usePermissions({
    type: "Stack",
    id: stack.id,
  });
  const container_terminals_disabled =
    useServer(stack.info.server_id)?.info.container_terminals_disabled ?? true;
  const logDisabled =
    !specificLogs || container_state === Types.ContainerStateStatusEnum.Empty;
  const inspectDisabled =
    !specificInspect ||
    container_state === Types.ContainerStateStatusEnum.Empty;
  const terminalDisabled =
    !specificTerminal ||
    container_terminals_disabled ||
    container_state !== Types.ContainerStateStatusEnum.Running;
  const view =
    (inspectDisabled && _view === "Inspect") ||
    (terminalDisabled && _view === "Terminals")
      ? "Log"
      : _view;

  const tabs = useMemo(
    () => [
      {
        value: "Log",
        disabled: logDisabled,
      },
      {
        value: "Inspect",
        disabled: inspectDisabled,
      },
      {
        value: "Terminals",
        disabled: terminalDisabled,
      },
    ],
    [logDisabled, inspectDisabled, terminalDisabled]
  );

  const Selector = (
    <MobileFriendlyTabsSelector
      tabs={tabs}
      value={view}
      onValueChange={setView as any}
      tabsTriggerClassname="w-[110px]"
    />
  );

  const target: Types.TerminalTarget = useMemo(
    () => ({
      type: "Stack",
      params: {
        stack: stack.id,
        service,
      },
    }),
    [stack.id, service]
  );

  switch (view) {
    case "Log":
      return (
        <StackServiceLogs
          id={stack.id}
          service={service}
          titleOther={Selector}
          disabled={logDisabled}
        />
      );
    case "Inspect":
      return (
        <StackServiceInspect
          id={stack.id}
          service={service}
          titleOther={Selector}
        />
      );
    case "Terminals":
      return <ContainerTerminals target={target} titleOther={Selector} />;
  }
};
