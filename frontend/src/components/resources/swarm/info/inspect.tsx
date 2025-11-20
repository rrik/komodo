import { Section } from "@components/layouts";
import { useRead } from "@lib/hooks";
import { ReactNode } from "react";
import { MonacoEditor } from "@components/monaco";

export const SwarmInspect = ({
  id,
  titleOther,
}: {
  id: string;
  titleOther: ReactNode;
}) => {
  const inspect =
    useRead("InspectSwarm", { swarm: id }, { refetchInterval: 10_000 }).data ??
    [];

  return (
    <Section titleOther={titleOther}>
      <MonacoEditor
        value={JSON.stringify(inspect, undefined, 2)}
        language="json"
      />
    </Section>
  );
};
