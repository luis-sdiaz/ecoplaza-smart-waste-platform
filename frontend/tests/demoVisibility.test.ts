import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SHOW_DEMO_DATA,
  DEMO_VISIBILITY_STORAGE_KEY,
  readStoredDemoVisibility,
  storeDemoVisibility,
} from "../src/services/demoVisibility.ts";

test("returns default true when demonstration data visibility is not set", () => {
  const mockStorage = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { mockStorage.set(key, value); },
    },
  } as unknown as Window & typeof globalThis;

  assert.equal(readStoredDemoVisibility(), DEFAULT_SHOW_DEMO_DATA);
});

test("reads true and false accurately from stored preference", () => {
  const mockStorage = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { mockStorage.set(key, value); },
    },
  } as unknown as Window & typeof globalThis;

  mockStorage.set(DEMO_VISIBILITY_STORAGE_KEY, "false");
  assert.equal(readStoredDemoVisibility(), false);

  mockStorage.set(DEMO_VISIBILITY_STORAGE_KEY, "true");
  assert.equal(readStoredDemoVisibility(), true);
});

test("stores demonstration visibility boolean safely in storage", () => {
  const mockStorage = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { mockStorage.set(key, value); },
    },
  } as unknown as Window & typeof globalThis;

  assert.equal(storeDemoVisibility(false), true);
  assert.equal(mockStorage.get(DEMO_VISIBILITY_STORAGE_KEY), "false");

  assert.equal(storeDemoVisibility(true), true);
  assert.equal(mockStorage.get(DEMO_VISIBILITY_STORAGE_KEY), "true");
});

test("handles storage access exceptions safely by falling back to default", () => {
  globalThis.window = {
    localStorage: {
      getItem: () => { throw new Error("Storage unavailable"); },
      setItem: () => { throw new Error("Storage unavailable"); },
    },
  } as unknown as Window & typeof globalThis;

  assert.equal(readStoredDemoVisibility(), DEFAULT_SHOW_DEMO_DATA);
  assert.equal(storeDemoVisibility(false), false);
});

