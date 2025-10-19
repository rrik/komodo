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

export type Tab<Value extends string = string> = {
  label?: string;
  hidden?: boolean;
  disabled?: boolean;
  value: Value;
  content: ReactNode;
};

export type TabNoContent<Value extends string = string> = Omit<
  Tab<Value>,
  "content"
>;

export const MobileFriendlyTabs = <Value extends string = string>(props: {
  tabs: Tab<Value>[];
  actions?: ReactNode;
  value: Value;
  onValueChange: (value: Value) => void;
}) => {
  return (
    <MobileFriendlyTabsWrapper
      Selector={<MobileFriendlyTabsSelector {...props} />}
      tabs={props.tabs}
      value={props.value}
    />
  );
};

export const MobileFriendlyTabsWrapper = <Value extends string = string>({
  Selector,
  tabs,
  value,
  className,
}: {
  Selector: ReactNode;
  tabs: Tab<Value>[];
  value: Value;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {Selector}
      <MobileFriendlyTabsContent tabs={tabs} value={value} />
    </div>
  );
};

export const MobileFriendlyTabsSelector = <Value extends string = string>({
  tabs: _tabs,
  actions,
  value,
  onValueChange,
  tabsTriggerClassname,
}: {
  tabs: TabNoContent<Value>[];
  actions?: ReactNode;
  value: Value;
  onValueChange: (value: Value) => void;
  tabsTriggerClassname?: string;
}) => {
  const tabs = _tabs.filter((t) => !t.hidden);
  return (
    <>
      <div className="hidden md:flex items-center justify-between">
        <Tabs value={value} onValueChange={onValueChange as any}>
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

export const MobileFriendlyTabsContent = <Value extends string = string>({
  tabs,
  value,
}: {
  tabs: Tab[];
  value: Value;
}) => {
  return tabs.find((tab) => tab.value === value)?.content;
};
