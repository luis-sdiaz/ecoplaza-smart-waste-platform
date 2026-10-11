import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import {
  clearDemoSession,
  readDemoSession,
  storeDemoSession,
} from "./authStorage";
import { DEMO_USER, verifyDemoCredentials } from "./demoAuth";
import {
  isValidProfileName,
  normalizeProfileName,
  readProfileName,
  storeProfileName,
} from "./profileStorage";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readDemoSession);
  const [demoUser, setDemoUser] = useState(() => ({
    ...DEMO_USER,
    name: readProfileName(DEMO_USER.id, DEMO_USER.name),
  }));
  const user = isAuthenticated ? demoUser : null;

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

  const updateUserName = (name: string): boolean => {
    const normalizedName = normalizeProfileName(name);

    if (!isValidProfileName(normalizedName)) return false;
    if (!storeProfileName(demoUser.id, normalizedName)) return false;

    setDemoUser((currentUser) => ({
      ...currentUser,
      name: normalizedName,
    }));
    return true;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, signIn, signOut, updateUserName }}>
      {children}
    </AuthContext.Provider>
  );
}
