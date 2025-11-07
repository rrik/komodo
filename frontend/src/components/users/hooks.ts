import { useAllResources, useRead } from "@lib/hooks";
import { Types } from "komodo_client";
import { UsableResource } from "@types";

export const useUserTargetPermissions = (user_target: Types.UserTarget) => {
  const permissions = useRead("ListUserTargetPermissions", {
    user_target,
  }).data;
  const allResources = useAllResources();
  const perms: (Types.Permission & { name: string })[] = [];
  for (const [resource_type, resources] of Object.entries(allResources)) {
    addPerms(
      user_target,
      permissions,
      resource_type as UsableResource,
      resources,
      perms
    );
  }
  return perms;
};

function addPerms<I>(
  user_target: Types.UserTarget,
  permissions: Types.Permission[] | undefined,
  resource_type: UsableResource,
  resources: Types.ResourceListItem<I>[] | undefined,
  perms: (Types.Permission & { name: string })[]
) {
  resources?.forEach((resource) => {
    const perm = permissions?.find(
      (p) =>
        p.resource_target.type === resource_type &&
        p.resource_target.id === resource.id
    );
    if (perm) {
      perms.push({ ...perm, name: resource.name });
    } else {
      perms.push({
        user_target,
        name: resource.name,
        level: Types.PermissionLevel.None,
        resource_target: { type: resource_type, id: resource.id },
      });
    }
  });
}
