import { Ms } from "./ms";

describe("Ms", () => {
  it.for([
    [10_000, 10_000],
    [-1000, -1000],
    [0, 0],
  ])("should return %i ms from %i ms", ([ms1, ms2]) => {
    const t = new Ms(ms1);
    expect(t.value()).toEqual(ms2);
  });
  it.for([
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
    const t = new Ms(ms);
    expect(t.seconds()).toEqual(s);
  });
  it.for([
    [0, 0],
    [1, 1_000_000],
    [-1, -1_000_000],
  ])("should convert %i ms to %i ns", ([ms, ns]) => {
    const t = new Ms(ms);
    expect(t.nanos()).toEqual(ns);
  });
});
