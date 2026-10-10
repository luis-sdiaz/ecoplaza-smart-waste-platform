import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { verifyDemoCredentials } from "./demoAuth";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const signIn = (email: string, password: string): boolean => {
    if (!verifyDemoCredentials(email, password)) return false;

    setIsAuthenticated(true);
    return true;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}
