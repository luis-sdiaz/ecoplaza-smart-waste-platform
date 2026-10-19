import assert from "node:assert/strict";
import test from "node:test";
import {
  formatColombianDate,
  formatColombianDateRange,
} from "../src/services/colombianDate.ts";

test("formats ISO dates into Colombian DD/MM/YYYY format", () => {
  assert.equal(formatColombianDate("2026-10-19"), "19/10/2026");
  assert.equal(formatColombianDate("2026-01-05"), "05/01/2026");
  assert.equal(formatColombianDate("2026-12-31"), "31/12/2026");
  assert.equal(formatColombianDate(""), "");
});

test("handles non-matching strings gracefully", () => {
  assert.equal(formatColombianDate("invalid-date"), "invalid-date");
});

test("formats date ranges into DD/MM/YYYY - DD/MM/YYYY", () => {
  assert.equal(
    formatColombianDateRange("2026-10-01", "2026-10-15"),
    "01/10/2026 - 15/10/2026",
  );
  assert.equal(formatColombianDateRange("", ""), "");
  assert.equal(formatColombianDateRange("2026-10-01", ""), "01/10/2026 - ...");
  assert.equal(formatColombianDateRange("", "2026-10-15"), "... - 15/10/2026");
});

