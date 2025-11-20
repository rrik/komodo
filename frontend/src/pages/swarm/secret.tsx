import { ResourceLink } from "@components/resources/common";
import { PageHeaderName } from "@components/util";
import { useRead, useSetTitle } from "@lib/hooks";
import { Button } from "@ui/button";
import { ChevronLeft, KeyRound, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MonacoEditor } from "@components/monaco";
import { useSwarm } from "@components/resources/swarm";

export default function SwarmSecretPage() {
  const { id, secret: __secret } = useParams() as {
    id: string;
    secret: string;
  };
  const _secret = decodeURIComponent(__secret);
  const swarm = useSwarm(id);
  const { data, isPending } = useRead("ListSwarmSecrets", { swarm: id });
  const secret = data?.find((secret) => secret.ID === _secret);
  useSetTitle(
    `${swarm?.name} | Secret | ${secret?.Spec?.Name ?? secret?.ID ?? "Unknown"}`
  );
  const nav = useNavigate();

  if (isPending) {
    return (
      <div className="flex justify-center w-full py-4">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!secret) {
    return <div className="flex w-full py-4">Failed to inspect secret.</div>;
  }

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
            <KeyRound className="w-8 h-8" />
          </div>
          <PageHeaderName name={secret?.Spec?.Name ?? secret?.ID} />
        </div>

        {/* INFO */}
        <div className="flex flex-wrap gap-4 items-center text-muted-foreground">
          Swarm Secret
          <ResourceLink type="Swarm" id={id} />
        </div>
      </div>

      <MonacoEditor
        value={JSON.stringify(secret, null, 2)}
        language="json"
        readOnly
      />
    </div>
  );
}
