import { Section } from "@components/layouts";
import { ReactNode, useMemo, useState } from "react";
import { Networks } from "./networks";
import { useServer } from "..";
import { Types } from "komodo_client";
import { useLocalStorage } from "@lib/hooks";
import { Images } from "./images";
import { Containers } from "./containers";
import { Volumes } from "./volumes";
import {
  MobileFriendlyTabsSelector,
  TabNoContent,
} from "@ui/mobile-friendly-tabs";

type ServerInfoView = "Containers" | "Networks" | "Volumes" | "Images";

export const ServerInfo = ({
  id,
  titleOther,
}: {
  id: string;
  titleOther: ReactNode;
}) => {
  const _search = useState("");
  const state = useServer(id)?.info.state ?? Types.ServerState.NotOk;
  const [view, setView] = useLocalStorage<ServerInfoView>(
    "server-info-view-v1",
    "Containers"
  );

  if ([Types.ServerState.NotOk, Types.ServerState.Disabled].includes(state)) {
    return (
      <Section titleOther={titleOther}>
        <h2 className="text-muted-foreground">
          Server unreachable, info is not available
        </h2>
      </Section>
    );
  }

  const tabsNoContent = useMemo<TabNoContent<ServerInfoView>[]>(
    () => [
      {
        value: "Containers",
      },
      {
        value: "Networks",
      },
      {
        value: "Volumes",
      },
      {
        value: "Images",
      },
    ],
    []
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
    case "Containers":
      return <Containers id={id} titleOther={Selector} _search={_search} />;
    case "Networks":
      return <Networks id={id} titleOther={Selector} _search={_search} />;
    case "Volumes":
      return <Volumes id={id} titleOther={Selector} _search={_search} />;
    case "Images":
      return <Images id={id} titleOther={Selector} _search={_search} />;
  }
};
