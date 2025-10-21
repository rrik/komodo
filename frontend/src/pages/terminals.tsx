import { Page } from "@components/layouts";
import { ResourceLink, ResourceSelector } from "@components/resources/common";
import { TagsFilter } from "@components/tags";
import { ConfirmButton } from "@components/util";
import { fmt_date_with_minutes } from "@lib/formatting";
import {
  usePermissions,
  useRead,
  useSetTitle,
  useShiftKeyListener,
  useTags,
  useWrite,
} from "@lib/hooks";
import { filterBySplit } from "@lib/utils";
import { Button } from "@ui/button";
import { DataTable, SortableHeader } from "@ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/dialog";
import { Input } from "@ui/input";
import { Types } from "komodo_client";
import { Loader2, PlusCircle, Search, Terminal, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function TerminalsPage() {
  useSetTitle("Terminals");
  const [search, set] = useState("");
  const { tags } = useTags();
  const servers = useRead("ListServers", { query: { tags } }).data ?? [];
  const { data, refetch } = useRead(
    "ListAllTerminals",
    { query: { tags }, fresh: true },
    { refetchInterval: 10_000 }
  );
  const terminals = data?.map((terminal) => {
    const server = servers.find((server) => server.id === terminal.server_id);
    return {
      ...terminal,
      server_name: server?.name ?? "Unknown",
      tags: server?.tags ?? [],
    };
  });
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
            <TagsFilter />
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
                  to={`/servers/${row.original.server_id}/terminal/${row.original.name}`}
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
              accessorKey: "server_name",
              header: ({ column }) => (
                <SortableHeader column={column} title="Server" />
              ),
              cell: ({ row }) => (
                <ResourceLink type="Server" id={row.original.server_id} />
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
                  server={row.original.server_id}
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

const default_create_terminal = (first_server: string) => {
  return {
    server: first_server,
    name: "term-1",
    command: undefined,
  } as Types.CreateTerminal;
};

const CreateTerminal = () => {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const first_server = (useRead("ListServers", {}).data ?? [])[0]?.id ?? "";
  const [request, setRequest] = useState<Types.CreateTerminal>(
    default_create_terminal(first_server)
  );
  useEffect(() => {
    if (open) return;
    setRequest(default_create_terminal(first_server));
  }, [first_server]);
  const { mutate, isPending } = useWrite("CreateTerminal", {
    onSuccess: () => {
      nav(`/servers/${request.server}/terminal/${request.name}`);
      setOpen(false);
      setRequest(default_create_terminal(first_server));
    },
  });
  const onConfirm = () => {
    if (!request.server || !request.name) return;
    mutate(request);
  };
  useShiftKeyListener("N", () => !open && setOpen(true));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="items-center gap-2" variant="secondary">
          New Terminal <PlusCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Terminal</DialogTitle>
          <DialogDescription>
            Choose the Server and Command for the new Terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 items-center">
          Server
          <ResourceSelector
            targetClassName="w-full justify-between"
            type="Server"
            selected={request.server}
            onSelect={(server) => setRequest((req) => ({ ...req, server }))}
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
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onConfirm}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BatchDeleteAllTerminals = ({
  refetch,
  noTerminals,
}: {
  refetch: () => void;
  noTerminals: boolean;
}) => {
  const { mutate, isPending } = useWrite("BatchDeleteAllTerminals", {
    onSuccess: refetch,
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
  server,
  terminal,
  refetch,
}: {
  server: string;
  terminal: string;
  refetch: () => void;
}) => {
  const { canWrite } = usePermissions({ type: "Server", id: server });
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: refetch,
  });
  return (
    <ConfirmButton
      title="Delete"
      variant="destructive"
      icon={<Trash className="w-4 h-4" />}
      className="w-[120px]"
      onClick={() => mutate({ server, terminal })}
      disabled={!canWrite}
      loading={isPending}
    />
  );
};
