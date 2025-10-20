import { Page } from "@components/layouts";
import { ResourceLink } from "@components/resources/common";
import { TableTags, TagsFilter } from "@components/tags";
import { useRead, useSetTitle, useTags } from "@lib/hooks";
import { filterBySplit } from "@lib/utils";
import { DataTable, SortableHeader } from "@ui/data-table";
import { Input } from "@ui/input";
import { Search, Terminal } from "lucide-react";
import { useState } from "react";

export default function TerminalsPage() {
  useSetTitle("Terminals");
  const [search, set] = useState("");
  const { tags } = useTags();
  const servers = useRead("ListServers", { query: { tags } }).data ?? [];
  const terminals = useRead(
    "ListAllTerminals",
    { query: { tags } },
    { refetchInterval: 10_000 }
  ).data?.map((terminal) => {
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
        <div className="flex flex-wrap gap-4 items-center justify-end">
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
              size: 200,
              accessorKey: "name",
              header: ({ column }) => (
                <SortableHeader column={column} title="Name" />
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
              size: 200,
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
              header: "Tags",
              cell: ({ row }) => <TableTags tag_ids={row.original.tags} />,
            },
          ]}
        />
      </div>
    </Page>
  );
}
