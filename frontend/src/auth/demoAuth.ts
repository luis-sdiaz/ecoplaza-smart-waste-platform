import type { AuthUser } from "./AuthContext";

// Public demo credentials. This temporary frontend check provides no production security.
export const DEMO_USER: AuthUser = {
  id: "demo-user",
  name: "Usuario Demo",
  email: "demo@ecoplaza.com",
  avatarUrl: null,
};

const DEMO_PASSWORD = "EcoPlaza2026!";

export function verifyDemoCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_PASSWORD;
}
