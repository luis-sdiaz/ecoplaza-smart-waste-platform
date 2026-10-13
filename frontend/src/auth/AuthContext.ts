import { createContext, useContext } from "react";
import type { ClassifiedAuthError } from "./authErrors";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: ClassifiedAuthError };

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  profileError: boolean;
  signIn: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  updateUserName: (name: string) => Promise<boolean>;
  updateUserAvatar: (avatar: Blob) => Promise<boolean>;
  removeUserAvatar: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
