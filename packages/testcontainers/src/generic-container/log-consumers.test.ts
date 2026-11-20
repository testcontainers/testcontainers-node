import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { LogConsumers } from "./log-consumers";

describe("LogConsumers.lines", () => {
  it.each([
    { name: "should call fn once per line when one chunk holds two lines", chunks: ["a\nb\n"], expected: ["a", "b"] },
    { name: "should join a line split across two chunks", chunks: ["he", "llo\n"], expected: ["hello"] },
    { name: "should call fn for the last line not ending with a new line", chunks: ["a\nb"], expected: ["a", "b"] },
    { name: "should strip \\r from \\r\\n line endings", chunks: ["a\r\nb\r\n"], expected: ["a", "b"] },
    { name: "should call fn for an empty line", chunks: ["a\n\nb\n"], expected: ["a", "", "b"] },
  ])("$name", async ({ chunks, expected }) => {
    const stream = new PassThrough({ encoding: "utf8" });

    const received: string[] = [];
    LogConsumers.lines((line) => received.push(line))(stream);
    for (const chunk of chunks) {
      stream.write(chunk);
    }
    stream.end();
    await finished(stream);
    expect(received).toEqual(expected);
  });
});
