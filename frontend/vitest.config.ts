import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "tests/**/*.component.test.tsx",
      "tests/geminiAiService.test.ts",
      "tests/assistantContextService.test.ts",
      "tests/assistantStorage.test.ts",
    ],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15000,
    env: {
      VITE_SUPABASE_URL: "https://placeholder.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder_key",
      VITE_SUPABASE_ANON_KEY: "placeholder-key",
    },
  },
});
