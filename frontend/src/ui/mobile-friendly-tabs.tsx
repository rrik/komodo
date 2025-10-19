import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type Tab = {
  label?: string;
  hidden?: boolean;
  value: string;
  content: ReactNode;
};

export const MobileFriendlyTabs = ({
  tabs: _tabs,
  actions,
  value,
  onValueChange,
}: {
  tabs: Tab[];
  actions?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const tabs = _tabs.filter((t) => !t.hidden);
  return (
    <>
      {/* Full view: Tabs */}
      <Tabs
        className="hidden md:flex flex-col gap-6"
        value={value}
        onValueChange={onValueChange}
      >
        <div className="flex items-center justify-between">
          <TabsList className="justify-start w-fit">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label ?? tab.value}
              </TabsTrigger>
            ))}
          </TabsList>
          {actions}
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {/* Mobile view: Dropdown */}
      <div className="flex flex-col gap-6 md:hidden">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label ?? tab.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tabs.find((tab) => tab.value === value)?.content}
      </div>
    </>
  );
};
