import { Page } from "@components/layouts";
import { ResourceLink, ResourceSelector } from "@components/resources/common";
import {
  ConfirmButton,
  ContainerTerminalModeSelector,
  DockerResourceLink,
  ServerContainerSelector,
  StackServiceLink,
  StackServiceSelector,
} from "@components/util";
import { fmt_date_with_minutes } from "@lib/formatting";
import {
  useRead,
  useSetTitle,
  useShiftKeyListener,
  useTags,
  useTerminalTargetPermissions,
  useWrite,
} from "@lib/hooks";
import { filterBySplit } from "@lib/utils";
import { Button } from "@ui/button";
import { DataTable, SortableHeader } from "@ui/data-table";
import { Input } from "@ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";
import { useToast } from "@ui/use-toast";
import { Types } from "komodo_client";
import { Loader2, PlusCircle, Search, Terminal, Trash } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function TerminalsPage() {
  useSetTitle("Terminals");
  const [search, set] = useState("");
  const { data: terminals, refetch } = useRead(
    "ListTerminals",
    {},
    { refetchInterval: 10_000 }
  );
  const filtered = filterBySplit(terminals ?? [], search, (item) => item.name);
  return (
    <Page
      icon={<Terminal className="w-8 h-8" />}
      title="Terminals"
      subtitle={
        <div className="text-muted-foreground">
          Manage Terminals across all your Servers.
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <CreateTerminal />
            <BatchDeleteAllTerminals
              refetch={refetch}
              noTerminals={!terminals?.length}
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="w-4 absolute top-[50%] left-3 -translate-y-[50%] text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => set(e.target.value)}
                placeholder="search..."
                className="pl-8 w-[200px] lg:w-[300px]"
              />
            </div>
          </div>
        </div>
        <DataTable
          tableKey="schedules"
          data={filtered}
          columns={[
            {
              accessorKey: "name",
              header: ({ column }) => (
                <SortableHeader column={column} title="Name" />
              ),
              cell: ({ row }) => (
                <Link
                  to={terminal_link(row.original.name, row.original.target)}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Terminal className="w-4 h-4" />
                  {row.original.name}
                </Link>
              ),
            },
            {
              size: 200,
              accessorKey: "target",
              header: ({ column }) => (
                <SortableHeader column={column} title="Target" />
              ),
              cell: ({ row }) => (
                <TerminalTargetResourceLink target={row.original.target} />
              ),
            },
            {
              accessorKey: "command",
              header: ({ column }) => (
                <SortableHeader column={column} title="Command" />
              ),
              cell: ({ row }) => (
                <span className="font-mono px-2 py-1 bg-secondary rounded-md">
                  {row.original.command}
                </span>
              ),
            },
            {
              size: 100,
              accessorKey: "size",
              header: ({ column }) => (
                <SortableHeader column={column} title="Size" />
              ),
              cell: ({
                row: {
                  original: { stored_size_kb },
                },
              }) => (
                <span className="font-mono px-2 py-1 bg-secondary rounded-md">
                  {stored_size_kb.toFixed()} KiB
                </span>
              ),
            },
            {
              accessorKey: "created_at",
              header: ({ column }) => (
                <SortableHeader column={column} title="Created" />
              ),
              cell: ({
                row: {
                  original: { created_at },
                },
              }) => fmt_date_with_minutes(new Date(created_at)),
            },
            {
              header: "Delete",
              cell: ({ row }) => (
                <DeleteTerminal
                  target={row.original.target}
                  terminal={row.original.name}
                  refetch={refetch}
                />
              ),
            },
          ]}
        />
      </div>
    </Page>
  );
}

const terminal_link = (name: string, target: Types.TerminalTarget) => {
  switch (target.type) {
    case "Server":
      return `/servers/${target.params.server}/terminal/${name}`;
    case "Container":
      return `/servers/${target.params.server}/container/${target.params.container}/terminal/${name}`;
    case "Stack":
      return `/stacks/${target.params.stack}/service/${target.params.service}/terminal/${name}`;
    case "Deployment":
      return `/deployments/${target.params.deployment}/terminal/${name}`;
  }
};

const TerminalTargetResourceLink = ({
  target,
}: {
  target: Types.TerminalTarget;
}) => {
  switch (target.type) {
    case "Server":
      return <ResourceLink type="Server" id={target.params.server!} />;
    case "Container":
      return (
        <DockerResourceLink
          type="container"
          server_id={target.params.server}
          name={target.params.container}
        />
      );
    case "Stack":
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceLink type="Stack" id={target.params.stack} />
          {target.params.service && (
            <StackServiceLink
              id={target.params.stack}
              service={target.params.service}
            />
          )}
        </div>
      );
    case "Deployment":
      return <ResourceLink type="Deployment" id={target.params.deployment} />;
  }
};

const TERMINAL_TYPES = ["Server", "Container", "Stack", "Deployment"] as const;
type TerminalType = (typeof TERMINAL_TYPES)[number];

const CreateTerminal = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TerminalType>("Server");
  useShiftKeyListener("N", () => !open && setOpen(true));

  const Selector = <CreateTerminalTypeSelector type={type} setType={setType} />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="items-center gap-2" variant="secondary">
          New Terminal <PlusCircle className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={14}
        className="w-[90vw] max-w-[500px]"
      >
        {type === "Server" ? (
          <CreateServerTerminal
            open={open}
            setOpen={setOpen}
            Selector={Selector}
          />
        ) : type === "Container" ? (
          <CreateContainerTerminal
            open={open}
            setOpen={setOpen}
            Selector={Selector}
          />
        ) : type === "Stack" ? (
          <CreateStackServiceTerminal setOpen={setOpen} Selector={Selector} />
        ) : type === "Deployment" ? (
          <CreateDeploymentTerminal setOpen={setOpen} Selector={Selector} />
        ) : (
          <></>
        )}
      </PopoverContent>
    </Popover>
  );
};

const CreateTerminalTypeSelector = ({
  type,
  setType,
}: {
  type: TerminalType;
  setType: (type: TerminalType) => void;
}) => {
  return (
    <>
      Type
      <Select value={type} onValueChange={setType}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TERMINAL_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
};

const CreateTerminalLayout = ({
  children,
  onConfirm,
  isPending,
}: {
  children: ReactNode;
  onConfirm: () => void;
  isPending: boolean;
}) => {
  return (
    <div className="flex flex-col gap-6 items-end">
      <div className="w-full grid md:grid-cols-[2fr_3fr] gap-6 items-center">
        {children}
      </div>

      <Button variant="secondary" onClick={onConfirm}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
      </Button>
    </div>
  );
};

const default_create_server_terminal = (
  first_server: string
): Types.CreateTerminal => {
  return {
    target: { type: "Server", params: { server: first_server } },
    name: "term-1",
    command: undefined,
  };
};

const CreateServerTerminal = ({
  open,
  setOpen,
  Selector,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  Selector: ReactNode;
}) => {
  const nav = useNavigate();
  const first_server = (useRead("ListServers", {}).data ?? [])[0]?.id ?? "";
  const [request, setRequest] = useState<Types.CreateTerminal>(
    default_create_server_terminal(first_server)
  );
  const { server } = request.target.params as {
    server: string;
  };
  useEffect(() => {
    if (open) return;
    setRequest(default_create_server_terminal(first_server));
  }, [first_server]);
  const { mutate, isPending } = useWrite("CreateTerminal", {
    onSuccess: () => {
      nav(`/servers/${server}/terminal/${request.name}`);
      setOpen(false);
      setRequest(default_create_server_terminal(first_server));
    },
  });
  const onConfirm = () => {
    if (!server || !request.name) return;
    mutate(request);
  };
  return (
    <CreateTerminalLayout onConfirm={onConfirm} isPending={isPending}>
      {Selector}
      Server
      <ResourceSelector
        targetClassName="w-full justify-between"
        type="Server"
        state={Types.ServerState.Ok}
        selected={server}
        onSelect={(server) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, server } as any,
            },
          }))
        }
        align="end"
      />
      Terminal Name
      <Input
        autoFocus
        placeholder="terminal-name"
        value={request.name}
        onChange={(e) =>
          setRequest((req) => ({ ...req, name: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm();
          }
        }}
      />
      Command
      <Input
        placeholder="bash (Optional)"
        value={request.command}
        onChange={(e) =>
          setRequest((req) => ({ ...req, command: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm();
          }
        }}
      />
    </CreateTerminalLayout>
  );
};

const default_create_container_terminal = (
  first_server: string
): Types.CreateTerminal => {
  return {
    target: {
      type: "Container",
      params: { server: first_server, container: "" },
    },
    name: "exec-1",
    mode: Types.ContainerTerminalMode.Exec,
    command: undefined,
  };
};

const CreateContainerTerminal = ({
  open,
  setOpen,
  Selector,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  Selector: ReactNode;
}) => {
  const nav = useNavigate();
  const first_server = (useRead("ListServers", {}).data ?? [])[0]?.id ?? "";
  const [request, setRequest] = useState<Types.CreateTerminal>(
    default_create_container_terminal(first_server)
  );
  useEffect(() => {
    if (open) return;
    setRequest(default_create_container_terminal(first_server));
  }, [first_server]);
  useEffect(() => {
    setRequest((req) => ({
      ...req,
      name:
        // Preserves existing name if non-default
        req.name !== "attach" && !req.name.startsWith("exec-")
          ? req.name
          : request.mode === Types.ContainerTerminalMode.Attach
            ? "attach"
            : "exec-1",
    }));
  }, [request.mode]);
  const { server, container } = request.target.params as {
    server: string;
    container: string;
  };
  const { mutate, isPending } = useWrite("CreateTerminal", {
    onSuccess: () => {
      nav(`/servers/${server}/container/${container}/terminal/${request.name}`);
      setOpen(false);
      setRequest(default_create_container_terminal(first_server));
    },
  });
  const onConfirm = () => {
    if (!server || !container) return;
    mutate(request);
  };
  return (
    <CreateTerminalLayout onConfirm={onConfirm} isPending={isPending}>
      {Selector}
      Server
      <ResourceSelector
        targetClassName="w-full justify-between"
        type="Server"
        state={Types.ServerState.Ok}
        selected={server}
        onSelect={(server) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, server } as any,
            },
          }))
        }
        align="end"
      />
      Container
      <ServerContainerSelector
        targetClassName="w-full justify-between"
        server_id={server}
        state={Types.ContainerStateStatusEnum.Running}
        selected={container}
        onSelect={(container) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, container } as any,
            },
          }))
        }
        align="end"
      />
      Terminal Name
      <Input
        autoFocus
        placeholder="terminal-name"
        value={request.name}
        onChange={(e) =>
          setRequest((req) => ({ ...req, name: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm();
          }
        }}
      />
      Mode
      <ContainerTerminalModeSelector
        mode={request.mode!}
        setMode={(mode) => setRequest({ ...request, mode })}
      />
      {request.mode !== Types.ContainerTerminalMode.Attach && (
        <>
          Command
          <Input
            placeholder="sh (Optional)"
            value={request.command}
            onChange={(e) =>
              setRequest((req) => ({ ...req, command: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              }
            }}
          />
        </>
      )}
    </CreateTerminalLayout>
  );
};

const default_create_stack_service_terminal = (
  first_stack: string
): Types.CreateTerminal => {
  return {
    target: {
      type: "Stack",
      params: { stack: first_stack, service: "" },
    },
    name: "exec-1",
    mode: Types.ContainerTerminalMode.Exec,
    command: undefined,
  };
};

const CreateStackServiceTerminal = ({
  setOpen,
  Selector,
}: {
  setOpen: (open: boolean) => void;
  Selector: ReactNode;
}) => {
  const nav = useNavigate();
  const first_stack =
    (useRead("ListStacks", {}).data ?? []).filter((s) =>
      [Types.StackState.Running, Types.StackState.Unhealthy].includes(
        s.info.state
      )
    )[0]?.id ?? "";
  const [request, setRequest] = useState<Types.CreateTerminal>(
    default_create_stack_service_terminal(first_stack)
  );
  useEffect(() => {
    setRequest(default_create_stack_service_terminal(first_stack));
  }, [first_stack]);
  useEffect(() => {
    setRequest((req) => ({
      ...req,
      name:
        // Preserves existing name if non-default
        req.name !== "attach" && !req.name.startsWith("exec-")
          ? req.name
          : request.mode === Types.ContainerTerminalMode.Attach
            ? "attach"
            : "exec-1",
    }));
  }, [request.mode]);
  const { stack, service } = request.target.params as {
    stack: string;
    service: string;
  };
  const { mutate, isPending } = useWrite("CreateTerminal", {
    onSuccess: () => {
      nav(`/stacks/${stack}/service/${service}/terminal/${request.name}`);
      setOpen(false);
      setRequest(default_create_stack_service_terminal(first_stack));
    },
  });
  const onConfirm = () => {
    if (!stack || !service) return;
    mutate(request);
  };
  return (
    <CreateTerminalLayout onConfirm={onConfirm} isPending={isPending}>
      {Selector}
      Stack
      <ResourceSelector
        targetClassName="w-full justify-between"
        type="Stack"
        state={Types.StackState.Running || Types.StackState.Unhealthy}
        selected={stack}
        onSelect={(stack) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, stack } as any,
            },
          }))
        }
        align="end"
      />
      Service
      <StackServiceSelector
        targetClassName="w-full justify-between"
        stack_id={stack}
        state={Types.ContainerStateStatusEnum.Running}
        selected={service}
        onSelect={(service) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, service } as any,
            },
          }))
        }
        align="end"
      />
      Terminal Name
      <Input
        autoFocus
        placeholder="terminal-name"
        value={request.name}
        onChange={(e) =>
          setRequest((req) => ({ ...req, name: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm();
          }
        }}
      />
      Mode
      <ContainerTerminalModeSelector
        mode={request.mode!}
        setMode={(mode) => setRequest({ ...request, mode })}
      />
      {request.mode !== Types.ContainerTerminalMode.Attach && (
        <>
          Command
          <Input
            placeholder="sh (Optional)"
            value={request.command}
            onChange={(e) =>
              setRequest((req) => ({ ...req, command: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              }
            }}
          />
        </>
      )}
    </CreateTerminalLayout>
  );
};

const default_create_deployment_terminal = (
  first_deployment: string
): Types.CreateTerminal => {
  return {
    target: {
      type: "Deployment",
      params: { deployment: first_deployment },
    },
    name: "exec-1",
    mode: Types.ContainerTerminalMode.Exec,
    command: undefined,
  };
};

const CreateDeploymentTerminal = ({
  setOpen,
  Selector,
}: {
  setOpen: (open: boolean) => void;
  Selector: ReactNode;
}) => {
  const nav = useNavigate();
  const first_deployment =
    (useRead("ListDeployments", {}).data ?? []).filter(
      (d) => d.info.state === Types.DeploymentState.Running
    )[0]?.id ?? "";
  const [request, setRequest] = useState<Types.CreateTerminal>(
    default_create_deployment_terminal(first_deployment)
  );
  useEffect(() => {
    setRequest(default_create_deployment_terminal(first_deployment));
  }, [first_deployment]);
  useEffect(() => {
    setRequest((req) => ({
      ...req,
      name:
        // Preserves existing name if non-default
        req.name !== "attach" && !req.name.startsWith("exec-")
          ? req.name
          : request.mode === Types.ContainerTerminalMode.Attach
            ? "attach"
            : "exec-1",
    }));
  }, [request.mode]);
  const { deployment } = request.target.params as {
    deployment: string;
  };
  const { mutate, isPending } = useWrite("CreateTerminal", {
    onSuccess: () => {
      nav(`/deployments/${deployment}/terminal/${request.name}`);
      setOpen(false);
      setRequest(default_create_deployment_terminal(first_deployment));
    },
  });
  const onConfirm = () => {
    if (!deployment) return;
    mutate(request);
  };
  return (
    <CreateTerminalLayout onConfirm={onConfirm} isPending={isPending}>
      {Selector}
      Deployment
      <ResourceSelector
        targetClassName="w-full justify-between"
        type="Deployment"
        state={Types.DeploymentState.Running}
        selected={deployment}
        onSelect={(deployment) =>
          setRequest((req) => ({
            ...req,
            target: {
              ...req.target,
              params: { ...req.target.params, deployment } as any,
            },
          }))
        }
        align="end"
      />
      Terminal Name
      <Input
        autoFocus
        placeholder="terminal-name"
        value={request.name}
        onChange={(e) =>
          setRequest((req) => ({ ...req, name: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onConfirm();
          }
        }}
      />
      Mode
      <ContainerTerminalModeSelector
        mode={request.mode!}
        setMode={(mode) => setRequest({ ...request, mode })}
      />
      {request.mode !== Types.ContainerTerminalMode.Attach && (
        <>
          Command
          <Input
            placeholder="sh (Optional)"
            value={request.command}
            onChange={(e) =>
              setRequest((req) => ({ ...req, command: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              }
            }}
          />
        </>
      )}
    </CreateTerminalLayout>
  );
};

const BatchDeleteAllTerminals = ({
  refetch,
  noTerminals,
}: {
  refetch: () => void;
  noTerminals: boolean;
}) => {
  const { toast } = useToast();
  const { mutate, isPending } = useWrite("BatchDeleteAllTerminals", {
    onSuccess: () => {
      refetch();
      toast({ title: "Deleted All Terminals" });
    },
  });
  const { tags } = useTags();
  return (
    <ConfirmButton
      title="Delete All"
      variant="destructive"
      icon={<Trash className="w-4 h-4" />}
      className="w-[160px]"
      onClick={() => mutate({ query: { tags } })}
      disabled={noTerminals}
      loading={isPending}
    />
  );
};

const DeleteTerminal = ({
  target,
  terminal,
  refetch,
}: {
  target: Types.TerminalTarget;
  terminal: string;
  refetch: () => void;
}) => {
  const { toast } = useToast();
  const { canWrite } = useTerminalTargetPermissions(target);
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: () => {
      refetch();
      toast({ title: `Deleted Terminal '${terminal}'` });
    },
  });
  return (
    <ConfirmButton
      title="Delete"
      variant="destructive"
      icon={<Trash className="w-4 h-4" />}
      className="w-[120px]"
      onClick={() => mutate({ target, terminal })}
      disabled={!canWrite}
      loading={isPending}
    />
  );
};
