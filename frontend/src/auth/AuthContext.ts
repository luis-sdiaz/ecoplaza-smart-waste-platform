import { createContext, useContext } from "react";

type AuthContextValue = {
  isAuthenticated: boolean;
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
