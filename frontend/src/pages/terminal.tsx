import { Page } from "@components/layouts";
import { ResourceLink } from "@components/resources/common";
import { useServer } from "@components/resources/server";
import { ServerTerminal } from "@components/terminal/server";
import { ConfirmButton } from "@components/util";
import { useSetTitle, useWrite } from "@lib/hooks";
import { useToast } from "@ui/use-toast";
import { Terminal, Trash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type WithTerminal = "servers" | "deployments" | "stacks";

export default function TerminalPage() {
  const { type, id, terminal } = useParams() as {
    type: string;
    id: string;
    terminal: string;
  };
  if (!["servers", "deployments", "stacks"].includes(type)) {
    return <div>This resource type does not have any Terminals.</div>;
  }
  return (
    <TerminalPageInner
      type={type as WithTerminal}
      id={id}
      terminal={terminal}
    />
  );
}

const TerminalPageInner = ({
  type: _type,
  id,
  terminal,
}: {
  type: WithTerminal;
  id: string;
  terminal: string;
}) => {
  const { toast } = useToast();
  const server = useServer(id);
  useSetTitle(`${server?.name} | Terminal | ${terminal}`);
  const nav = useNavigate();
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: () => {
      toast({ title: "Terminal deleted" });
      nav("/terminals");
    },
  });

  return (
    <Page
      className="gap-4"
      title={terminal}
      icon={<Terminal className="w-8 h-8" />}
      subtitle={
        <div className="flex items-center gap-4 text-muted-foreground">
          <div>Terminal</div>
          |
          <ResourceLink type="Server" id={id} />
          |
          <ConfirmButton
            title="Delete"
            icon={<Trash className="w-4 h-4" />}
            variant="destructive"
            onClick={() => mutate({ server: id, terminal })}
            loading={isPending}
          />
        </div>
      }
    >
      <ServerTerminal server={id} terminal={terminal} selected _reconnect />
    </Page>
  );
};
