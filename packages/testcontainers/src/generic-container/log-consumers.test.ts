import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { LogConsumers } from "./log-consumers";

describe("LogConsumers", () => {
  it("should call fn once per line when one chunk holds two lines", async () => {
    const stream = new PassThrough({ encoding: "utf8" });

    const received: string[] = [];
    LogConsumers.lines((line) => received.push(line))(stream);
    stream.write("a\nb\n");
    stream.end();
    await finished(stream);
    expect(received).toEqual(["a", "b"]);
  });

  it("should join a line split across two chunks", async () => {
    const stream = new PassThrough({ encoding: "utf8" });

    const received: string[] = [];
    LogConsumers.lines((line) => received.push(line))(stream);
    stream.write("he");
    stream.write("llo\n");
    stream.end();
    await finished(stream);
    expect(received).toEqual(["hello"]);
  });

  it("should call fn for the last line not ending with a new line", async () => {
    const stream = new PassThrough({ encoding: "utf8" });

    const received: string[] = [];
    LogConsumers.lines((line) => received.push(line))(stream);
    stream.write("a\nb");
    stream.end();
    await finished(stream);
    expect(received).toEqual(["a", "b"]);
  });

  it("should strip \\r from \\r\\n line endings", async () => {
    const stream = new PassThrough({ encoding: "utf8" });

    const received: string[] = [];
    LogConsumers.lines((line) => received.push(line))(stream);
    stream.write("a\r\nb\r\n");
    stream.end();
    await finished(stream);
    expect(received).toEqual(["a", "b"]);
  });
});
