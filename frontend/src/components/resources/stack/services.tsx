import { Section } from "@components/layouts";
import { container_state_intention } from "@lib/color";
import { useRead } from "@lib/hooks";
import { DataTable, SortableHeader } from "@ui/data-table";
import { useStack } from ".";
import { Types } from "komodo_client";
import { Fragment, ReactNode } from "react";
import {
  ContainerPortsTableView,
  DockerResourceLink,
  StackServiceLink,
  StatusBadge,
} from "@components/util";

export const StackServices = ({
  id,
  titleOther,
}: {
  id: string;
  titleOther: ReactNode;
}) => {
  const info = useStack(id)?.info;
  const server_id = info?.server_id;
  const state = info?.state ?? Types.StackState.Unknown;
  const services = useRead(
    "ListStackServices",
    { stack: id },
    { refetchInterval: 10_000 }
  ).data;
  if (
    !services ||
    services.length === 0 ||
    [Types.StackState.Unknown, Types.StackState.Down].includes(state)
  ) {
    return null;
  }
  return (
    <Section titleOther={titleOther}>
      <div className="lg:min-h-[300px]">
        <DataTable
          tableKey="StackServices"
          data={services}
          columns={[
            {
              accessorKey: "service",
              size: 200,
              header: ({ column }) => (
                <SortableHeader column={column} title="Service" />
              ),
              cell: ({ row }) => (
                <StackServiceLink id={id} service={row.original.service} />
              ),
            },
            {
              accessorKey: "container.state",
              size: 160,
              header: ({ column }) => (
                <SortableHeader column={column} title="State" />
              ),
              cell: ({ row }) => {
                const state = row.original.container?.state;
                return (
                  <StatusBadge
                    text={state}
                    intent={container_state_intention(state)}
                  />
                );
              },
            },
            {
              accessorKey: "container.image",
              size: 300,
              header: ({ column }) => (
                <SortableHeader column={column} title="Image" />
              ),
              cell: ({ row }) =>
                server_id && (
                  <DockerResourceLink
                    type="image"
                    server_id={server_id}
                    name={row.original.container?.image}
                    id={row.original.container?.image_id}
                  />
                ),
              // size: 200,
            },
            {
              accessorKey: "container.networks.0",
              size: 200,
              header: ({ column }) => (
                <SortableHeader column={column} title="Networks" />
              ),
              cell: ({ row }) =>
                (row.original.container?.networks?.length ?? 0) > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {server_id &&
                      row.original.container?.networks?.map((network, i) => (
                        <Fragment key={network}>
                          <DockerResourceLink
                            type="network"
                            server_id={server_id}
                            name={network}
                          />
                          {i !==
                            row.original.container!.networks!.length - 1 && (
                            <div className="text-muted-foreground">|</div>
                          )}
                        </Fragment>
                      ))}
                  </div>
                ) : (
                  server_id &&
                  row.original.container?.network_mode && (
                    <DockerResourceLink
                      type="network"
                      server_id={server_id}
                      name={row.original.container.network_mode}
                    />
                  )
                ),
            },
            {
              accessorKey: "container.ports.0",
              size: 200,
              header: ({ column }) => (
                <SortableHeader column={column} title="Ports" />
              ),
              cell: ({ row }) => (
                <ContainerPortsTableView
                  ports={row.original.container?.ports ?? []}
                  server_id={server_id}
                />
              ),
            },
          ]}
        />
      </div>
    </Section>
  );
};
