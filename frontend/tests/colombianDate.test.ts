import assert from "node:assert/strict";
import test from "node:test";
import {
  formatColombianDate,
  formatColombianDateRange,
  formatColombianDateTime,
  formatColombianTime,
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

test("formatColombianDateTime formats ISO timestamps into Colombian time zone", () => {
  assert.equal(formatColombianDateTime(""), "—");
  assert.equal(formatColombianDateTime(null), "—");
  assert.equal(formatColombianDateTime("invalid-timestamp"), "invalid-timestamp");

  // UTC 20:00:00 on 2026-11-04 is 15:00:00 (03:00:00 PM) in America/Bogota (UTC-5)
  const formatted = formatColombianDateTime("2026-11-04T20:00:00.000Z");
  assert.match(formatted, /04\/11\/2026/);
  assert.match(formatted, /03:00:00/);
});

test("formatColombianTime formats ISO timestamps into Colombian hh:mm a format", () => {
  assert.equal(formatColombianTime(""), "");
  assert.equal(formatColombianTime(null), "");
  assert.equal(formatColombianTime("invalid-time"), "");

  // UTC 20:30:00 on 2026-11-04 is 15:30 (03:30 PM) in America/Bogota (UTC-5)
  const formattedEs = formatColombianTime("2026-11-04T20:30:00.000Z", "es");
  assert.match(formattedEs, /03:30/);

  const formattedEn = formatColombianTime("2026-11-04T20:30:00.000Z", "en");
  assert.match(formattedEn, /03:30/);
});


