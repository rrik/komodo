import { Section } from "@components/layouts";
import { useRead } from "@lib/hooks";
import { DataTable, SortableHeader } from "@ui/data-table";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { Search } from "lucide-react";
import { Input } from "@ui/input";
import { filterBySplit } from "@lib/utils";

export const SwarmServices = ({
  id,
  titleOther,
  _search,
}: {
  id: string;
  titleOther: ReactNode;
  _search: [string, Dispatch<SetStateAction<string>>];
}) => {
  const [search, setSearch] = _search;
  const services =
    useRead("ListSwarmServices", { swarm: id }, { refetchInterval: 10_000 })
      .data ?? [];

  const filtered = filterBySplit(
    services,
    search,
    (service) => service.Spec?.Name ?? service.ID ?? "Unknown"
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
        tableKey="server-services"
        data={filtered}
        columns={[
          {
            accessorKey: "Name",
            header: ({ column }) => (
              <SortableHeader column={column} title="ID" />
            ),
            cell: ({ row }) => row.original.Spec?.Name ?? "Unknown",
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
            accessorKey: "ServiceStatus",
            header: ({ column }) => (
              <SortableHeader column={column} title="Status" />
            ),
            cell: ({ row }) => row.original.UpdateStatus?.State ?? "Unknown",
            size: 200,
          },
        ]}
      />
    </Section>
  );
};
