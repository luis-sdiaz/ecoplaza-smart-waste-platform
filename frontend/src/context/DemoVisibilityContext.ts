import { createContext, useContext } from "react";
import {
  DEFAULT_SHOW_DEMO_DATA,
  DEMO_VISIBILITY_STORAGE_KEY,
  readStoredDemoVisibility,
  storeDemoVisibility,
} from "../services/demoVisibility.ts";

export {
  DEFAULT_SHOW_DEMO_DATA,
  DEMO_VISIBILITY_STORAGE_KEY,
  readStoredDemoVisibility,
  storeDemoVisibility,
};

export interface DemoVisibilityContextType {
  showDemoData: boolean;
  setShowDemoData: (visible: boolean) => void;
}

export const DemoVisibilityContext = createContext<DemoVisibilityContextType>({
  showDemoData: DEFAULT_SHOW_DEMO_DATA,
  setShowDemoData: () => {},
});

export function useDemoVisibility(): DemoVisibilityContextType {
  return useContext(DemoVisibilityContext);
}
