import { atomWithStorage } from "@lib/hooks";
import { useAtom } from "jotai";

interface DashboardPreferences {
  showServerStats: boolean;
  showTables: boolean;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  showServerStats: false,
  showTables: false,
};

export const dashboardPreferencesAtom = atomWithStorage<DashboardPreferences>(
  "komodo-dashboard-preferences-v2",
  DEFAULT_PREFERENCES
);

export const useDashboardPreferences = () => {
  const [preferences, setPreferences] = useAtom<DashboardPreferences>(
    dashboardPreferencesAtom
  );

  const updatePreference = <K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
  ) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const togglePreference = <K extends keyof DashboardPreferences>(key: K) => {
    updatePreference(key, !preferences[key]);
  };

  return {
    preferences,
    updatePreference,
    togglePreference,
  };
};
