import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.component.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
  },
});
