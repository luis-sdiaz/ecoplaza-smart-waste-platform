import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { verifyDemoCredentials } from "./demoAuth";

const DEMO_SESSION_STORAGE_KEY = "ecoplaza-demo-session";

function readDemoSession(): boolean {
  try {
    return sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function storeDemoSession(isAuthenticated: boolean): void {
  try {
    if (isAuthenticated) {
      sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, "true");
    } else {
      sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    }
  } catch {
    return;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readDemoSession);

  const signIn = (email: string, password: string): boolean => {
    if (!verifyDemoCredentials(email, password)) return false;

    storeDemoSession(true);
    setIsAuthenticated(true);
    return true;
  };

  const signOut = (): void => {
    storeDemoSession(false);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
