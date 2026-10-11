import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string, remember: boolean) => boolean;
  signOut: () => void;
  updateUserName: (name: string) => boolean;
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
