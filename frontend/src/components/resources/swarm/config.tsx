import { Config } from "@components/config";
import { ConfigItem } from "@components/config/util";
import { useLocalStorage, usePermissions, useRead, useWrite } from "@lib/hooks";
import { Types } from "komodo_client";
import { ResourceSelector } from "../common";
import { Button } from "@ui/button";
import { MinusCircle, PlusCircle } from "lucide-react";

export const SwarmConfig = ({ id }: { id: string }) => {
  const { canWrite } = usePermissions({ type: "Swarm", id });
  const swarm = useRead("GetSwarm", { swarm: id }).data;
  const config = swarm?.config;
  const global_disabled =
    useRead("GetCoreInfo", {}).data?.ui_write_disabled ?? false;
  const [update, set] = useLocalStorage<Partial<Types.SwarmConfig>>(
    `swarm-${id}-update-v1`,
    {}
  );
  const { mutateAsync } = useWrite("UpdateSwarm");

  if (!config) return null;

  const disabled = global_disabled || !canWrite;

  return (
    <Config
      disabled={disabled}
      original={config}
      update={update}
      set={set}
      onSave={async () => {
        await mutateAsync({ id, config: update });
      }}
      components={{
        "": [
          {
            label: "Managers",
            labelHidden: true,
            components: {
              server_ids: (server_ids, set) => {
                return (
                  <ConfigItem
                    label="Manager Nodes"
                    description="Select the Servers which have joined the Swarm as Manager Nodes."
                  >
                    <div className="flex flex-col gap-4 w-full">
                      {server_ids?.map((server_id, index) => (
                        <div key={index} className="w-full flex gap-4">
                          <ResourceSelector
                            type="Server"
                            exclude_ids={server_ids}
                            selected={server_id}
                            onSelect={(server_id) =>
                              set({
                                server_ids: [
                                  ...server_ids.map((id, i) =>
                                    i === index ? server_id : id
                                  ),
                                ],
                              })
                            }
                            disabled={disabled}
                            align="start"
                          />
                          {!disabled && (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                set({
                                  server_ids: [
                                    ...server_ids?.filter(
                                      (_, i) => i !== index
                                    ),
                                  ],
                                })
                              }
                            >
                              <MinusCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!disabled && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            set({
                              server_ids: [...(server_ids ?? []), ""],
                            })
                          }
                          className="flex items-center gap-2 w-[200px]"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Add Server
                        </Button>
                      )}
                    </div>
                  </ConfigItem>
                );
              },
            },
          },
        ],
      }}
    />
  );
};
