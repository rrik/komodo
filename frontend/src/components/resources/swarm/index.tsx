import { useRead } from "@lib/hooks";
import { RequiredResourceComponents } from "@types";
import { Boxes } from "lucide-react";
import { SwarmConfig } from "./config";
import { DeleteResource, NewResource, ResourcePageHeader } from "../common";
import { SwarmTable } from "./table";
import {
  swarm_state_intention,
  stroke_color_class_by_intention,
} from "@lib/color";
import { cn } from "@lib/utils";
import { Types } from "komodo_client";
import { DashboardPieChart } from "@components/util";
import { StatusBadge } from "@components/util";
import { GroupActions } from "@components/group-actions";

export const useSwarm = (id?: string) =>
  useRead("ListSwarms", {}, { refetchInterval: 10_000 }).data?.find(
    (d) => d.id === id
  );

export const useFullSwarm = (id: string) =>
  useRead("GetSwarm", { swarm: id }, { refetchInterval: 10_000 }).data;

const SwarmIcon = ({ id, size }: { id?: string; size: number }) => {
  const state = useSwarm(id)?.info.state;
  const color = stroke_color_class_by_intention(swarm_state_intention(state));
  return <Boxes className={cn(`w-${size} h-${size}`, state && color)} />;
};

export const SwarmComponents: RequiredResourceComponents = {
  list_item: (id) => useSwarm(id),
  resource_links: (resource) => (resource.config as Types.SwarmConfig).links,

  Description: () => <>Control and monitor docker swarms.</>,

  Dashboard: () => {
    const summary = useRead("GetSwarmsSummary", {}).data;
    return (
      <DashboardPieChart
        data={[
          { intention: "Good", value: summary?.healthy ?? 0, title: "Healthy" },
          {
            intention: "Critical",
            value: summary?.unhealthy ?? 0,
            title: "Unhealthy",
          },
          {
            intention: "Unknown",
            value: summary?.unknown ?? 0,
            title: "Unknown",
          },
        ]}
      />
    );
  },

  New: () => <NewResource type="Swarm" />,

  GroupActions: () => <GroupActions type="Swarm" actions={[]} />,

  Table: ({ resources }) => (
    <SwarmTable swarms={resources as Types.SwarmListItem[]} />
  ),

  Icon: ({ id }) => <SwarmIcon id={id} size={4} />,
  BigIcon: ({ id }) => <SwarmIcon id={id} size={8} />,

  State: ({ id }) => {
    const state = useSwarm(id)?.info.state;
    return <StatusBadge text={state} intent={swarm_state_intention(state)} />;
  },

  Info: {},

  Status: {},

  Actions: {},

  Page: {},

  Config: SwarmConfig,

  DangerZone: ({ id }) => <DeleteResource type="Swarm" id={id} />,

  ResourcePageHeader: ({ id }) => {
    const swarm = useSwarm(id);

    return (
      <ResourcePageHeader
        intent={swarm_state_intention(swarm?.info.state)}
        icon={<SwarmIcon id={id} size={8} />}
        type="Swarm"
        id={id}
        resource={swarm}
        state={swarm?.info.state}
        status=""
      />
    );
  },
};
