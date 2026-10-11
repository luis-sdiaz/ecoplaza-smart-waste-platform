import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import {
  clearDemoSession,
  readDemoSession,
  storeDemoSession,
} from "./authStorage";
import { DEMO_USER, verifyDemoCredentials } from "./demoAuth";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readDemoSession);
  const user = isAuthenticated ? DEMO_USER : null;

  const signIn = (email: string, password: string, remember: boolean): boolean => {
    if (!verifyDemoCredentials(email, password)) return false;

    storeDemoSession(remember);
    setIsAuthenticated(true);
    return true;
  };

  const signOut = (): void => {
    clearDemoSession();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
