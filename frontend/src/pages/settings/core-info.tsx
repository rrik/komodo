import { MonacoEditor } from "@components/monaco";
import { CopyButton } from "@components/util";
import { useRead } from "@lib/hooks";
import { Button } from "@ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/dialog";
import { Input } from "@ui/input";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";

export const CoreInfo = () => {
  const info = useRead("GetCoreInfo", {}).data;
  return (
    <div className="flex gap-4 items-center flex-wrap w-fit pb-4 border-b-2">
      <div className="font-mono bg-secondary px-2.5 py-1.5 rounded-md">
        {info?.title}
      </div>
      <div className="text-muted-foreground">|</div>
      <AllInfo />
      <div className="text-muted-foreground">|</div>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="text-muted-foreground">Public Key</div>
        <Input
          className="w-[150px] md:w-[230px] bg-secondary"
          value={info?.public_key}
          disabled
        />
        <CopyButton content={info?.public_key} />
      </div>
    </div>
  );
};

const AllInfo = () => {
  const [open, setOpen] = useState(false);
  const info = useRead("GetCoreInfo", {}).data;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="gap-2 items-center">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[900px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Core Info</DialogTitle>
        </DialogHeader>
        {info ? (
          <MonacoEditor
            value={JSON.stringify(info, undefined, 2)}
            language="json"
            readOnly
          />
        ) : (
          <div className="w-full h-full flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
