import { ResourceLink } from "@components/resources/common";
import { PageHeaderName } from "@components/util";
import { useRead, useSetTitle } from "@lib/hooks";
import { Button } from "@ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MonacoEditor } from "@components/monaco";
import { SWARM_ICONS, useSwarm } from "@components/resources/swarm";

export default function SwarmTaskPage() {
  const { id, task: __task } = useParams() as {
    id: string;
    task: string;
  };
  const _task = decodeURIComponent(__task);
  const swarm = useSwarm(id);
  const { data: task, isPending } = useRead("InspectSwarmTask", {
    swarm: id,
    task: _task,
  });
  useSetTitle(`${swarm?.name} | Task | ${task?.ID ?? "Unknown"}`);
  const nav = useNavigate();

  if (isPending) {
    return (
      <div className="flex justify-center w-full py-4">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return <div className="flex w-full py-4">Failed to inspect task.</div>;
  }

  const Icon = SWARM_ICONS.Task;

  return (
    <div className="flex flex-col gap-16 mb-24">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        {/* BACK */}
        <div className="flex items-center justify-between mb-4">
          <Button
            className="gap-2"
            variant="secondary"
            onClick={() => nav("/swarms/" + id)}
          >
            <ChevronLeft className="w-4" /> Back
          </Button>
        </div>

        {/* TITLE */}
        <div className="flex items-center gap-4">
          <div className="mt-1">
            <Icon size={8} />
          </div>
          <PageHeaderName name={task.ID} />
        </div>

        {/* INFO */}
        <div className="flex flex-wrap gap-4 items-center text-muted-foreground">
          Swarm Task
          <ResourceLink type="Swarm" id={id} />
        </div>
      </div>

      <MonacoEditor
        value={JSON.stringify(task, null, 2)}
        language="json"
        readOnly
      />
    </div>
  );
}
