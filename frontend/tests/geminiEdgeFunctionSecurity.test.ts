import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const FUNCTION_URL = new URL(
  "../../supabase/functions/gemini-assistant/index.ts",
  import.meta.url,
);
const SUPABASE_CONFIG_URL = new URL(
  "../../supabase/config.toml",
  import.meta.url,
);
const ENV_EXAMPLE_URL = new URL("../.env.example", import.meta.url);
const PACKAGE_URL = new URL("../package.json", import.meta.url);

test("Gemini se ejecuta en una Edge Function autenticada, no en el cliente", () => {
  assert.equal(fs.existsSync(FUNCTION_URL), true);
  const source = fs.readFileSync(FUNCTION_URL, "utf8");
  const config = fs.readFileSync(SUPABASE_CONFIG_URL, "utf8");

  assert.match(config, /\[functions\.gemini-assistant\]/);
  assert.match(config, /verify_jwt\s*=\s*true/);
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /consumeRateLimit\(user\.id\)/);
  assert.doesNotMatch(source, /SERVICE_ROLE|supabaseAdmin/i);
});

test("la función limita entradas y aísla la frecuencia por id de usuario", () => {
  const source = fs.readFileSync(FUNCTION_URL, "utf8");
  assert.match(source, /PROMPT_LIMIT\s*=\s*4_000/);
  assert.match(source, /SYSTEM_INSTRUCTION_LIMIT\s*=\s*40_000/);
  assert.match(source, /REQUESTS_PER_WINDOW\s*=\s*12/);
  assert.match(source, /rateBuckets\.get\(userId\)/);
  assert.match(source, /rateBuckets\.set\(userId/);
});

test("ninguna clave privada de Gemini se documenta como variable VITE ni dependencia cliente", () => {
  const envExample = fs.readFileSync(ENV_EXAMPLE_URL, "utf8");
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_URL, "utf8"));

  assert.doesNotMatch(envExample, /^VITE_GEMINI_API_KEY=/m);
  assert.doesNotMatch(envExample, /^VITE_GEMINI_MODEL=/m);
  assert.equal(packageJson.dependencies?.["@google/generative-ai"], undefined);
  assert.equal(packageJson.dependencies?.["@google/genai"], undefined);
});
