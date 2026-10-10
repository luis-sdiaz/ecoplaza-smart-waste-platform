// Public demo credentials. This temporary frontend check provides no production security.
const DEMO_EMAIL = "demo@ecoplaza.com";
const DEMO_PASSWORD = "EcoPlaza2026!";

export function verifyDemoCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}
