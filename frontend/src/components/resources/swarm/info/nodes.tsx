import { Section } from "@components/layouts";
import { useRead } from "@lib/hooks";
import { DataTable, SortableHeader } from "@ui/data-table";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { Diamond, Search } from "lucide-react";
import { Input } from "@ui/input";
import { filterBySplit } from "@lib/utils";
import { Link } from "react-router-dom";

export const SwarmNodes = ({
  id,
  titleOther,
  _search,
}: {
  id: string;
  titleOther: ReactNode;
  _search: [string, Dispatch<SetStateAction<string>>];
}) => {
  const [search, setSearch] = _search;
  const nodes =
    useRead("ListSwarmNodes", { swarm: id }, { refetchInterval: 10_000 })
      .data ?? [];

  const filtered = filterBySplit(
    nodes,
    search,
    (node) => node.Name ?? node.Hostname ?? node.ID ?? "Unknown"
  );

  return (
    <Section
      titleOther={titleOther}
      actions={
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="w-4 absolute top-[50%] left-3 -translate-y-[50%] text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search..."
              className="pl-8 w-[200px] lg:w-[300px]"
            />
          </div>
        </div>
      }
    >
      <DataTable
        containerClassName="min-h-[60vh]"
        tableKey="swarm-nodes"
        data={filtered}
        columns={[
          {
            accessorKey: "Hostname",
            header: ({ column }) => (
              <SortableHeader column={column} title="Hostname" />
            ),
            cell: ({ row }) => (
              <Link
                to={`/swarms/${id}/swarm-node/${row.original.ID}`}
                className="flex gap-2 items-center hover:underline"
              >
                <Diamond className="w-4 h-4" />
                {row.original.Hostname ?? "Unknown"}
              </Link>
            ),
            size: 200,
          },
          {
            accessorKey: "ID",
            header: ({ column }) => (
              <SortableHeader column={column} title="Id" />
            ),
            cell: ({ row }) => row.original.ID ?? "Unknown",
            size: 200,
          },
          {
            accessorKey: "Role",
            header: ({ column }) => (
              <SortableHeader column={column} title="Role" />
            ),
            cell: ({ row }) => row.original.Role ?? "Unknown",
            size: 200,
          },
          {
            accessorKey: "Availability",
            header: ({ column }) => (
              <SortableHeader column={column} title="Availability" />
            ),
            cell: ({ row }) => row.original.Availability ?? "Unknown",
            size: 200,
          },
          {
            accessorKey: "State",
            header: ({ column }) => (
              <SortableHeader column={column} title="State" />
            ),
            cell: ({ row }) => row.original.State ?? "Unknown",
          },
        ]}
      />
    </Section>
  );
};
