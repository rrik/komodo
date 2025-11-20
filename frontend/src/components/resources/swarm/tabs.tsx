import { useLocalStorage } from "@lib/hooks";
import { useMemo } from "react";
import {
  MobileFriendlyTabsSelector,
  TabNoContent,
} from "@ui/mobile-friendly-tabs";
import { SwarmConfig } from "./config";
import { SwarmInfo } from "./info";

type SwarmTabsView = "Config" | "Info";

export const SwarmTabs = ({ id }: { id: string }) => {
  const [view, setView] = useLocalStorage<SwarmTabsView>(
    `swarm-${id}-tab-v1`,
    "Config"
  );

  // const swarm_info = useSwarm(id)?.info;

  const tabs = useMemo<TabNoContent<SwarmTabsView>[]>(
    () => [
      {
        value: "Config",
      },
      {
        value: "Info",
      },
    ],
    []
  );

  const Selector = (
    <MobileFriendlyTabsSelector
      tabs={tabs}
      value={view}
      onValueChange={setView as any}
      tabsTriggerClassname="w-[110px]"
    />
  );

  switch (view) {
    case "Config":
      return <SwarmConfig id={id} titleOther={Selector} />;
    case "Info":
      return <SwarmInfo id={id} titleOther={Selector} />;
  }
};
