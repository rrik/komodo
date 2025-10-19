import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "./tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "@lib/utils";

export type Tab = {
  label?: string;
  hidden?: boolean;
  disabled?: boolean;
  value: string;
  content: ReactNode;
};

export type TabNoContent = Omit<Tab, "content">;

export const MobileFriendlyTabs = (props: {
  tabs: Tab[];
  actions?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <MobileFriendlyTabsWrapper
      Selector={<MobileFriendlyTabsSelector {...props} />}
      tabs={props.tabs}
      value={props.value}
    />
  );
};

export const MobileFriendlyTabsWrapper = ({
  Selector,
  tabs,
  value,
  className,
}: {
  Selector: ReactNode;
  tabs: Tab[];
  value: string;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {Selector}
      <MobileFriendlyTabsContent tabs={tabs} value={value} />
    </div>
  );
};

export const MobileFriendlyTabsSelector = ({
  tabs: _tabs,
  actions,
  value,
  onValueChange,
  tabsTriggerClassname,
}: {
  tabs: TabNoContent[];
  actions?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  tabsTriggerClassname?: string;
}) => {
  const tabs = _tabs.filter((t) => !t.hidden);
  return (
    <>
      <div className="hidden md:flex items-center justify-between">
        <Tabs value={value} onValueChange={onValueChange}>
          <TabsList className="justify-start w-fit">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className={tabsTriggerClassname}
              >
                {tab.label ?? tab.value}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {actions}
      </div>

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="md:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tabs.map((tab) => (
            <SelectItem
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
            >
              {tab.label ?? tab.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
};

export const MobileFriendlyTabsContent = ({
  tabs,
  value,
}: {
  tabs: Tab[];
  value: string;
}) => {
  return tabs.find((tab) => tab.value === value)?.content;
};
