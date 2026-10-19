import { useCallback, useState, type ReactNode } from "react";
import { readStoredDemoVisibility, storeDemoVisibility } from "../services/demoVisibility.ts";
import { DemoVisibilityContext } from "./DemoVisibilityContext.ts";

export function DemoVisibilityProvider({ children }: { children: ReactNode }) {
  const [showDemoData, setShowDemoDataState] = useState<boolean>(readStoredDemoVisibility);

  const setShowDemoData = useCallback((visible: boolean): void => {
    setShowDemoDataState(visible);
    storeDemoVisibility(visible);
  }, []);

  return (
    <DemoVisibilityContext.Provider value={{ showDemoData, setShowDemoData }}>
      {children}
    </DemoVisibilityContext.Provider>
  );
}
