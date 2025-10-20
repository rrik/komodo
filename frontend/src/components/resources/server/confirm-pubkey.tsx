import { useToast } from "@ui/use-toast";
import { useServer } from ".";
import { usePermissions, useWrite } from "@lib/hooks";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/dialog";
import { Card } from "@ui/card";
import { cn } from "@lib/utils";
import { Button } from "@ui/button";
import { Loader2 } from "lucide-react";

export const ConfirmAttemptedPubkey = ({ id }: { id: string }) => {
  const { toast } = useToast();
  const server = useServer(id);
  const { canWrite } = usePermissions({ type: "Server", id });
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useWrite("UpdateServerPublicKey", {
    onSuccess: () => {
      toast({ title: "Confirmed Server public key" });
      setOpen(false);
    },
    onError: () => {
      setOpen(false);
    },
  });

  if (!server?.info.attempted_public_key) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!canWrite}>
        <Card
          className={cn(
            "px-3 py-2 bg-destructive/75 hover:bg-destructive transition-colors",
            canWrite && "cursor-pointer"
          )}
        >
          <div className="text-sm text-nowrap overflow-hidden overflow-ellipsis">
            Invalid Pubkey
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Confirm {server.name} public key?</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground text-sm">
          <div>
            Public Key:{" "}
            <span className="text-foreground">
              {server.info.attempted_public_key}
            </span>
          </div>
          {!server.info.address && (
            <div>Note. May take a few moments for status to update.</div>
          )}
        </div>
        <DialogFooter>
          <Button
            className="w-[200px]"
            variant="secondary"
            onClick={() =>
              mutate({
                server: id,
                public_key: server.info.attempted_public_key!,
              })
            }
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
