import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string, remember: boolean) => boolean;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
