import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { verifyDemoCredentials } from "./demoAuth";

const DEMO_SESSION_STORAGE_KEY = "ecoplaza-demo-session";
const DEMO_REMEMBERED_STORAGE_KEY = "ecoplaza-demo-remembered";

type StorageAccessor = () => Storage;

function hasStorageMark(getStorage: StorageAccessor, key: string): boolean {
  try {
    return getStorage().getItem(key) === "true";
  } catch {
    return false;
  }
}

function setStorageMark(getStorage: StorageAccessor, key: string): void {
  try {
    getStorage().setItem(key, "true");
  } catch {
    return;
  }
}

function removeStorageMark(getStorage: StorageAccessor, key: string): void {
  try {
    getStorage().removeItem(key);
  } catch {
    return;
  }
}

const getSessionStorage = () => sessionStorage;
const getLocalStorage = () => localStorage;

function readDemoSession(): boolean {
  return (
    hasStorageMark(getSessionStorage, DEMO_SESSION_STORAGE_KEY) ||
    hasStorageMark(getLocalStorage, DEMO_REMEMBERED_STORAGE_KEY)
  );
}

function storeDemoSession(remember: boolean): void {
  if (remember) {
    setStorageMark(getLocalStorage, DEMO_REMEMBERED_STORAGE_KEY);
    removeStorageMark(getSessionStorage, DEMO_SESSION_STORAGE_KEY);
    return;
  }

  setStorageMark(getSessionStorage, DEMO_SESSION_STORAGE_KEY);
  removeStorageMark(getLocalStorage, DEMO_REMEMBERED_STORAGE_KEY);
}

function clearDemoSession(): void {
  removeStorageMark(getSessionStorage, DEMO_SESSION_STORAGE_KEY);
  removeStorageMark(getLocalStorage, DEMO_REMEMBERED_STORAGE_KEY);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readDemoSession);

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
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
