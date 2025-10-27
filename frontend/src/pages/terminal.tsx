import { Page } from "@components/layouts";
import { ResourceLink } from "@components/resources/common";
import { useDeployment } from "@components/resources/deployment";
import { useServer } from "@components/resources/server";
import { useStack } from "@components/resources/stack";
import { ContainerTerminal } from "@components/terminal/container";
import { ServerTerminal } from "@components/terminal/server";
import {
  ConfirmButton,
  DockerResourceLink,
  StackServiceLink,
} from "@components/util";
import { useSetTitle, useWrite } from "@lib/hooks";
import { useToast } from "@ui/use-toast";
import { Types } from "komodo_client";
import { Terminal, Trash } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

type WithTerminal = "servers" | "deployments" | "stacks" | string;

export default function TerminalPage() {
  const { type, id, terminal, container, service } = useParams() as {
    type: WithTerminal;
    id: string;
    terminal: string;
    container: string | undefined;
    service: string | undefined;
  };
  switch (type) {
    case "servers":
      if (container) {
        return (
          <ContainerTerminalPage
            type={type as WithTerminal}
            id={id}
            container={container}
            terminal={terminal}
          />
        );
      } else {
        return (
          <ServerTerminalPage
            type={type as WithTerminal}
            id={id}
            terminal={terminal}
          />
        );
      }

    case "stacks":
      return service ? (
        <StackServiceTerminalPage
          type={type as WithTerminal}
          id={id}
          service={service}
          terminal={terminal}
        />
      ) : (
        <div>Missing :service in URL</div>
      );

    case "deployments":
      return (
        <DeploymentTerminalPage
          type={type as WithTerminal}
          id={id}
          terminal={terminal}
        />
      );

    default:
      return <div>This resource type does not have any Terminals.</div>;
  }
}

const ServerTerminalPage = ({
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
      toast({ title: `Deleted Terminal '${terminal}'` });
      nav("/terminals");
    },
  });
  return (
    <TerminalPageLayout
      terminal={terminal}
      Link={<ResourceLink type="Server" id={id} />}
      ConfirmButton={
        <ConfirmButton
          title="Delete"
          icon={<Trash className="w-4 h-4" />}
          variant="destructive"
          onClick={() =>
            mutate({
              target: { type: "Server", params: { server: id } },
              terminal,
            })
          }
          loading={isPending}
        />
      }
      Terminal={
        <ServerTerminal server={id} terminal={terminal} selected _reconnect />
      }
    />
  );
};

const ContainerTerminalPage = ({
  type: _type,
  id,
  container,
  terminal,
}: {
  type: WithTerminal;
  id: string;
  container: string;
  terminal: string;
}) => {
  const { toast } = useToast();
  const server = useServer(id);
  useSetTitle(`${server?.name} | ${container} Terminal | ${terminal}`);
  const nav = useNavigate();
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: () => {
      toast({ title: `Deleted Terminal '${terminal}'` });
      nav("/terminals");
    },
  });
  const target: Types.TerminalTarget = useMemo(
    () => ({
      type: "Container",
      params: { server: id, container },
    }),
    [id, container]
  );
  return (
    <TerminalPageLayout
      terminal={terminal}
      Link={
        <DockerResourceLink type="container" server_id={id} name={container} />
      }
      ConfirmButton={
        <ConfirmButton
          title="Delete"
          icon={<Trash className="w-4 h-4" />}
          variant="destructive"
          onClick={() =>
            mutate({
              target,
              terminal,
            })
          }
          loading={isPending}
        />
      }
      Terminal={
        <ContainerTerminal
          target={target}
          terminal={terminal}
          selected
          _reconnect
        />
      }
    />
  );
};

const StackServiceTerminalPage = ({
  type: _type,
  id,
  service,
  terminal,
}: {
  type: WithTerminal;
  id: string;
  service: string;
  terminal: string;
}) => {
  const { toast } = useToast();
  const stack = useStack(id);
  useSetTitle(`${stack?.name} | ${service} Terminal | ${terminal}`);
  const nav = useNavigate();
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: () => {
      toast({ title: `Deleted Terminal '${terminal}'` });
      nav("/terminals");
    },
  });
  const target: Types.TerminalTarget = useMemo(
    () => ({
      type: "Stack",
      params: { stack: id, service },
    }),
    [id, service]
  );
  return (
    <TerminalPageLayout
      terminal={terminal}
      Link={
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceLink type="Stack" id={target.params.stack} />
          {target.params.service && (
            <StackServiceLink
              id={target.params.stack}
              service={target.params.service}
            />
          )}
        </div>
      }
      ConfirmButton={
        <ConfirmButton
          title="Delete"
          icon={<Trash className="w-4 h-4" />}
          variant="destructive"
          onClick={() =>
            mutate({
              target,
              terminal,
            })
          }
          loading={isPending}
        />
      }
      Terminal={
        <ContainerTerminal
          target={target}
          terminal={terminal}
          selected
          _reconnect
        />
      }
    />
  );
};

const DeploymentTerminalPage = ({
  type: _type,
  id,
  terminal,
}: {
  type: WithTerminal;
  id: string;
  terminal: string;
}) => {
  const { toast } = useToast();
  const deployment = useDeployment(id);
  useSetTitle(`${deployment?.name} | Terminal | ${terminal}`);
  const nav = useNavigate();
  const { mutate, isPending } = useWrite("DeleteTerminal", {
    onSuccess: () => {
      toast({ title: `Deleted Terminal '${terminal}'` });
      nav("/terminals");
    },
  });
  const target: Types.TerminalTarget = useMemo(
    () => ({
      type: "Deployment",
      params: { deployment: id },
    }),
    [id]
  );
  return (
    <TerminalPageLayout
      terminal={terminal}
      Link={<ResourceLink type="Deployment" id={id} />}
      ConfirmButton={
        <ConfirmButton
          title="Delete"
          icon={<Trash className="w-4 h-4" />}
          variant="destructive"
          onClick={() =>
            mutate({
              target,
              terminal,
            })
          }
          loading={isPending}
        />
      }
      Terminal={
        <ContainerTerminal
          target={target}
          terminal={terminal}
          selected
          _reconnect
        />
      }
    />
  );
};

const TerminalPageLayout = ({
  terminal,
  Link,
  ConfirmButton,
  Terminal: TerminalComponent,
}: {
  terminal: string;
  Link: ReactNode;
  ConfirmButton: ReactNode;
  Terminal: ReactNode;
}) => {
  return (
    <Page
      className="gap-4"
      title={terminal}
      icon={<Terminal className="w-8 h-8" />}
      subtitle={
        <div className="flex items-center gap-4 text-muted-foreground">
          <div>Terminal</div>|{Link}|{ConfirmButton}
        </div>
      }
    >
      {TerminalComponent}
    </Page>
  );
};
