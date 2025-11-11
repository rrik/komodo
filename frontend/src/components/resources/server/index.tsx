import { useExecute, useRead, useUser } from "@lib/hooks";
import { cn } from "@lib/utils";
import { Types } from "komodo_client";
import { RequiredResourceComponents } from "@types";
import {
  Server,
  Cpu,
  MemoryStick,
  Database,
  Play,
  RefreshCcw,
  Pause,
  Square,
  AlertCircle,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { Prune } from "./actions";
import {
  server_state_intention,
  stroke_color_class_by_intention,
} from "@lib/color";
import { ServerTable } from "./table";
import { DeleteResource, NewResource, ResourcePageHeader } from "../common";
import { ActionWithDialog, ConfirmButton, StatusBadge } from "@components/util";
import { DashboardPieChart } from "@components/util";
import { ServerStatsMini } from "./stats-mini";
import { GroupActions } from "@components/group-actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip";
import { useToast } from "@ui/use-toast";
import { ServerTabs } from "./tabs";
import { ConfirmAttemptedPubkey } from "./confirm-pubkey";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@ui/hover-card";

export const useServer = (id?: string) =>
  useRead("ListServers", {}, { refetchInterval: 10_000 }).data?.find(
    (d) => d.id === id
  );

// Helper function to check if server is available for API calls
export const useIsServerAvailable = (serverId?: string) => {
  const server = useServer(serverId);
  return server?.info.state === Types.ServerState.Ok;
};

export const useFullServer = (id: string) =>
  useRead("GetServer", { server: id }, { refetchInterval: 10_000 }).data;

// Helper function to check for version mismatch
export const useVersionMismatch = (serverId?: string) => {
  const core_version = useRead("GetVersion", {}).data?.version;
  const server_version = useServer(serverId)?.info.version;

  const unknown = !server_version || server_version === "Unknown";
  const mismatch =
    !!server_version && !!core_version && server_version !== core_version;

  return { unknown, mismatch, hasVersionMismatch: mismatch && !unknown };
};

const Icon = ({ id, size }: { id?: string; size: number }) => {
  const state = useServer(id)?.info.state;
  const { hasVersionMismatch } = useVersionMismatch(id);

  return (
    <Server
      className={cn(
        `w-${size} h-${size}`,
        state &&
          stroke_color_class_by_intention(
            server_state_intention(state, hasVersionMismatch)
          )
      )}
    />
  );
};

export const ServerVersion = ({ id }: { id: string }) => {
  const core_version = useRead("GetVersion", {}).data?.version;
  const version = useServer(id)?.info.version;
  const server_state = useServer(id)?.info.state;

  const unknown = !version || version === "Unknown";
  const mismatch = !!version && !!core_version && version !== core_version;

  // Don't show version for disabled servers
  if (server_state === Types.ServerState.Disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            <AlertCircle
              className={cn(
                "w-4 h-4",
                stroke_color_class_by_intention("Unknown")
              )}
            />
            Unknown
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div>
            Server is <span className="font-bold">disabled</span> - version
            unknown.
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          {unknown ? (
            <AlertCircle
              className={cn(
                "w-4 h-4",
                stroke_color_class_by_intention("Unknown")
              )}
            />
          ) : mismatch ? (
            <AlertCircle
              className={cn(
                "w-4 h-4",
                stroke_color_class_by_intention("Critical")
              )}
            />
          ) : (
            <CheckCircle2
              className={cn("w-4 h-4", stroke_color_class_by_intention("Good"))}
            />
          )}
          {version ?? "Unknown"}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {unknown ? (
          <div>
            Periphery version is <span className="font-bold">unknown</span>.
          </div>
        ) : mismatch ? (
          <div>
            Periphery version <span className="font-bold">mismatch</span>.
            Expected <span className="font-bold">{core_version}</span>.
          </div>
        ) : (
          <div>
            Periphery and Core version <span className="font-bold">match</span>.
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export { ServerStatsMini };

export const ServerComponents: RequiredResourceComponents = {
  list_item: (id) => useServer(id),
  resource_links: (resource) => (resource.config as Types.ServerConfig).links,

  Description: () => (
    <>Connect servers for alerting, building, and deploying.</>
  ),

  Dashboard: () => {
    const summary = useRead(
      "GetServersSummary",
      {},
      { refetchInterval: 15_000 }
    ).data;
    return (
      <DashboardPieChart
        data={[
          { title: "Healthy", intention: "Good", value: summary?.healthy ?? 0 },
          {
            title: "Warning",
            intention: "Warning",
            value: summary?.warning ?? 0,
          },
          {
            title: "Unhealthy",
            intention: "Critical",
            value: summary?.unhealthy ?? 0,
          },
          {
            title: "Disabled",
            intention: "Neutral",
            value: summary?.disabled ?? 0,
          },
        ]}
      />
    );
  },

  New: () => {
    const user = useUser().data;
    if (!user) return null;
    if (!user.admin && !user.create_server_permissions) return null;
    return <NewResource type="Server" />;
  },

  GroupActions: () => (
    <GroupActions
      type="Server"
      actions={[
        "PruneContainers",
        "PruneNetworks",
        "PruneVolumes",
        "PruneImages",
        "PruneSystem",
        "RestartAllContainers",
        "StopAllContainers",
      ]}
    />
  ),

  Table: ({ resources }) => (
    <ServerTable servers={resources as Types.ServerListItem[]} />
  ),

  Icon: ({ id }) => <Icon id={id} size={4} />,
  BigIcon: ({ id }) => <Icon id={id} size={8} />,

  State: ({ id }) => {
    const state = useServer(id)?.info.state;
    const { hasVersionMismatch } = useVersionMismatch(id);

    // Show full version mismatch text
    const displayState =
      state === Types.ServerState.Ok && hasVersionMismatch
        ? "Version Mismatch"
        : state === Types.ServerState.NotOk
          ? "Not Ok"
          : state;

    return (
      <StatusBadge
        text={displayState}
        intent={server_state_intention(state, hasVersionMismatch)}
      />
    );
  },

  Status: {
    ConfirmAttemptedPubkey,
  },

  Info: {
    ServerVersion,
    PublicIP: ({ id }) => {
      const { toast } = useToast();
      const public_ip = useServer(id)?.info.public_ip;

      return (
        <HoverCard>
          <HoverCardTrigger>
            <div
              className="flex gap-2 items-center cursor-pointer"
              onClick={() => {
                public_ip &&
                  navigator.clipboard
                    .writeText(public_ip)
                    .then(() => toast({ title: "Copied public IP" }));
              }}
            >
              <Globe className="w-4 h-4" />
              {public_ip ?? "Unknown IP"}
            </div>
          </HoverCardTrigger>
          <HoverCardContent sideOffset={4} className="w-fit text-sm">
            Public IP (click to copy)
          </HoverCardContent>
        </HoverCard>
      );
    },
    Cpu: ({ id }) => {
      const isServerAvailable = useIsServerAvailable(id);
      const core_count =
        useRead(
          "GetSystemInformation",
          { server: id },
          {
            enabled: isServerAvailable,
            refetchInterval: 5000,
          }
        ).data?.core_count ?? 0;
      return (
        <HoverCard>
          <HoverCardTrigger>
            <div className="flex gap-2 items-center">
              <Cpu className="w-4 h-4" />
              {core_count
                ? `${core_count} Core${core_count === 1 ? "" : "s"}`
                : "N/A"}
            </div>
          </HoverCardTrigger>
          <HoverCardContent sideOffset={4} className="w-fit text-sm">
            CPU Core Count
          </HoverCardContent>
        </HoverCard>
      );
    },
    LoadAvg: ({ id }) => {
      const isServerAvailable = useIsServerAvailable(id);
      const stats = useRead(
        "GetSystemStats",
        { server: id },
        {
          enabled: isServerAvailable,
          refetchInterval: 5000,
        }
      ).data;

      const one = stats?.load_average?.one;

      return (
        <HoverCard>
          <HoverCardTrigger>
            <div className="flex gap-2 items-center">
              <Cpu className="w-4 h-4" />
              {one?.toFixed(2) ?? "N/A"}
            </div>
          </HoverCardTrigger>
          <HoverCardContent sideOffset={4} className="w-fit text-sm">
            1m Load Average
          </HoverCardContent>
        </HoverCard>
      );
    },
    Mem: ({ id }) => {
      const isServerAvailable = useIsServerAvailable(id);
      const stats = useRead(
        "GetSystemStats",
        { server: id },
        {
          enabled: isServerAvailable,
          refetchInterval: 5000,
        }
      ).data;
      return (
        <HoverCard>
          <HoverCardTrigger>
            <div className="flex gap-2 items-center">
              <MemoryStick className="w-4 h-4" />
              {stats?.mem_total_gb.toFixed(2).concat(" GB") ?? "N/A"}
            </div>
          </HoverCardTrigger>
          <HoverCardContent sideOffset={4} className="w-fit text-sm">
            Total Memory
          </HoverCardContent>
        </HoverCard>
      );
    },
    Disk: ({ id }) => {
      const isServerAvailable = useIsServerAvailable(id);
      const stats = useRead(
        "GetSystemStats",
        { server: id },
        {
          enabled: isServerAvailable,
          refetchInterval: 5000,
        }
      ).data;

      const disk_total_gb = stats?.disks.reduce(
        (acc, curr) => acc + curr.total_gb,
        0
      );
      return (
        <HoverCard>
          <HoverCardTrigger>
            <div className="flex gap-2 items-center">
              <Database className="w-4 h-4" />
              {disk_total_gb?.toFixed(2).concat(" GB") ?? "N/A"}
            </div>
          </HoverCardTrigger>
          <HoverCardContent sideOffset={4} className="w-fit text-sm">
            Total Disk Capacity
          </HoverCardContent>
        </HoverCard>
      );
    },
  },

  Actions: {
    StartAll: ({ id }) => {
      const server = useServer(id);
      const { mutate, isPending } = useExecute("StartAllContainers");
      const starting = useRead(
        "GetServerActionState",
        { server: id },
        { refetchInterval: 5000 }
      ).data?.starting_containers;
      const dontShow =
        useRead("ListDockerContainers", {
          server: id,
        }).data?.every(
          (container) =>
            container.state === Types.ContainerStateStatusEnum.Running
        ) ?? true;
      if (dontShow) {
        return null;
      }
      const pending = isPending || starting;
      return (
        server && (
          <ConfirmButton
            title="Start Containers"
            icon={<Play className="w-4 h-4" />}
            onClick={() => mutate({ server: id })}
            loading={pending}
            disabled={pending}
          />
        )
      );
    },
    RestartAll: ({ id }) => {
      const server = useServer(id);
      const { mutate, isPending } = useExecute("RestartAllContainers");
      const restarting = useRead(
        "GetServerActionState",
        { server: id },
        { refetchInterval: 5000 }
      ).data?.restarting_containers;
      const pending = isPending || restarting;
      return (
        server && (
          <ActionWithDialog
            name={server?.name}
            title="Restart Containers"
            icon={<RefreshCcw className="w-4 h-4" />}
            onClick={() => mutate({ server: id })}
            disabled={pending}
            loading={pending}
          />
        )
      );
    },
    PauseAll: ({ id }) => {
      const server = useServer(id);
      const { mutate, isPending } = useExecute("PauseAllContainers");
      const pausing = useRead(
        "GetServerActionState",
        { server: id },
        { refetchInterval: 5000 }
      ).data?.pausing_containers;
      const dontShow =
        useRead("ListDockerContainers", {
          server: id,
        }).data?.every(
          (container) =>
            container.state !== Types.ContainerStateStatusEnum.Running
        ) ?? true;
      if (dontShow) {
        return null;
      }
      const pending = isPending || pausing;
      return (
        server && (
          <ActionWithDialog
            name={server?.name}
            title="Pause Containers"
            icon={<Pause className="w-4 h-4" />}
            onClick={() => mutate({ server: id })}
            disabled={pending}
            loading={pending}
          />
        )
      );
    },
    UnpauseAll: ({ id }) => {
      const server = useServer(id);
      const { mutate, isPending } = useExecute("UnpauseAllContainers");
      const unpausing = useRead(
        "GetServerActionState",
        { server: id },
        { refetchInterval: 5000 }
      ).data?.unpausing_containers;
      const dontShow =
        useRead("ListDockerContainers", {
          server: id,
        }).data?.every(
          (container) =>
            container.state !== Types.ContainerStateStatusEnum.Paused
        ) ?? true;
      if (dontShow) {
        return null;
      }
      const pending = isPending || unpausing;
      return (
        server && (
          <ConfirmButton
            title="Unpause Containers"
            icon={<Play className="w-4 h-4" />}
            onClick={() => mutate({ server: id })}
            loading={pending}
            disabled={pending}
          />
        )
      );
    },
    StopAll: ({ id }) => {
      const server = useServer(id);
      const { mutate, isPending } = useExecute("StopAllContainers");
      const stopping = useRead(
        "GetServerActionState",
        { server: id },
        { refetchInterval: 5000 }
      ).data?.stopping_containers;
      const pending = isPending || stopping;
      return (
        server && (
          <ActionWithDialog
            name={server.name}
            title="Stop Containers"
            icon={<Square className="w-4 h-4" />}
            onClick={() => mutate({ server: id })}
            disabled={pending}
            loading={pending}
          />
        )
      );
    },
    PruneBuildx: ({ id }) => <Prune server_id={id} type="Buildx" />,
    PruneSystem: ({ id }) => <Prune server_id={id} type="System" />,
  },

  Page: {},

  Config: ServerTabs,

  DangerZone: ({ id }) => <DeleteResource type="Server" id={id} />,

  ResourcePageHeader: ({ id }) => {
    const server = useServer(id);
    const { hasVersionMismatch } = useVersionMismatch(id);

    // Determine display state for header (longer text is okay in header)
    const displayState =
      server?.info.state === Types.ServerState.Ok && hasVersionMismatch
        ? "Version Mismatch"
        : server?.info.state === Types.ServerState.NotOk
          ? "Not Ok"
          : server?.info.state;

    return (
      <ResourcePageHeader
        intent={server_state_intention(server?.info.state, hasVersionMismatch)}
        icon={<Icon id={id} size={8} />}
        type="Server"
        id={id}
        resource={server}
        state={displayState}
        status={server?.info.region}
      />
    );
  },
};
