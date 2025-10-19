import { atomWithStorage } from "@lib/hooks";
import { sync_no_changes } from "@lib/utils";
import { useAtom } from "jotai";
import { Types } from "komodo_client";
import { useFullResourceSync } from ".";
import { useMemo } from "react";
import {
  MobileFriendlyTabsSelector,
  TabNoContent,
} from "@ui/mobile-friendly-tabs";
import { ResourceSyncInfo } from "./info";
import { ResourceSyncPending } from "./pending";
import { ResourceSyncConfig } from "./config";

type ResourceSyncTabsView = "Config" | "Info" | "Execute" | "Commit";
const syncTabsViewAtom = atomWithStorage<ResourceSyncTabsView>(
  "sync-tabs-v4",
  "Config"
);

export const useResourceSyncTabsView = (
  sync: Types.ResourceSync | undefined
) => {
  const [_view, setView] = useAtom<ResourceSyncTabsView>(syncTabsViewAtom);

  const hideInfo = sync?.config?.files_on_host
    ? false
    : sync?.config?.file_contents
      ? true
      : false;

  const showPending =
    sync && (!sync_no_changes(sync) || sync.info?.pending_error);

  const view =
    _view === "Info" && hideInfo
      ? "Config"
      : (_view === "Execute" || _view === "Commit") && !showPending
        ? sync?.config?.files_on_host ||
          sync?.config?.repo ||
          sync?.config?.linked_repo
          ? "Info"
          : "Config"
        : _view === "Commit" && !sync?.config?.managed
          ? "Execute"
          : _view;

  return {
    view,
    setView,
    hideInfo,
    showPending,
  };
};

export const SyncTabs = ({ id }: { id: string }) => {
  const sync = useFullResourceSync(id);
  const { view, setView, hideInfo, showPending } =
    useResourceSyncTabsView(sync);

  const tabsNoContent = useMemo<TabNoContent[]>(
    () => [
      {
        value: "Config",
      },
      {
        value: "Info",
        hidden: hideInfo,
      },
      {
        value: "Execute",
        disabled: !showPending,
      },
      {
        value: "Commit",
        hidden: !sync?.config?.managed,
        disabled: !showPending,
      },
    ],
    [hideInfo, sync?.config?.managed, showPending]
  );

  const Selector = (
    <MobileFriendlyTabsSelector
      tabs={tabsNoContent}
      value={view}
      onValueChange={setView as any}
      tabsTriggerClassname="w-[110px]"
    />
  );

  switch (view) {
    case "Info":
      return <ResourceSyncInfo id={id} titleOther={Selector} />;
    case "Execute":
      return <ResourceSyncPending id={id} titleOther={Selector} />;
    case "Commit":
      return <ResourceSyncPending id={id} titleOther={Selector} />;
    default:
      return <ResourceSyncConfig id={id} titleOther={Selector} />;
  }
};
