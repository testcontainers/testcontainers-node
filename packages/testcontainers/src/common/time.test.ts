import { toNanos, toSeconds, toUnixSeconds } from "./time";

test.for([
  [0, 0],
  [10, 0],
  [999, 0],
  [1010, 1],
  [1999, 1],
  [10_000, 10],
  [-10, -0],
  [-999, -0],
  [-1010, -1],
  [-1999, -1],
  [-10_000, -10],
])("should convert %i ms to %i seconds", ([ms, s]) => {
  expect(toSeconds(ms)).toEqual(s);
});

test.for([
  [0, 0],
  [1, 1_000_000],
  [-1, -1_000_000],
])("should convert %i ms to %i ns", ([ms, ns]) => {
  expect(toNanos(ms)).toEqual(ns);
});

test("toUnixSeconds leaves a Unix-seconds number unchanged", () => {
  expect(toUnixSeconds(1_700_000_000)).toEqual(1_700_000_000);
});

test("toUnixSeconds converts a Date to Unix seconds", () => {
  expect(toUnixSeconds(new Date(1_700_000_000_123))).toEqual(1_700_000_000);
});
