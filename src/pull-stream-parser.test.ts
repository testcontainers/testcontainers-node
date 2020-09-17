import { Duplex, Readable } from "stream";
import { PullStreamParser } from "./pull-stream-parser";
import { FakeLogger } from "./logger";
import { RepoTag } from "./repo-tag";

describe("PullStreamParser", () => {
  let logger: FakeLogger;
  let parser: PullStreamParser;
  let stream: Readable;

  beforeEach(() => {
    logger = new FakeLogger();
    parser = new PullStreamParser(new RepoTag("image", "tag"), logger);
    stream = new Duplex();
  });

  it("should wait for stream to end", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(null);
    stream.destroy();

    await promise;
  });

  it("should log nothing if the message is invalid JSON", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`Invalid`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toHaveLength(0);
    expect(logger.warnLogs).toEqual(["Unexpected message format: Invalid"]);
  });

  it("should log status", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer","id":"id"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - id - Pulling from cristianrgreco/testcontainer"]);
  });

  it("should not log the same status twice", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer","id":"id"}\n`);
    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer","id":"id"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - id - Pulling from cristianrgreco/testcontainer"]);
  });

  it("should not log the same status twice per image id", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer","id":"id1"}\n`);
    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer","id":"id2"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual([
      "Pulling image:tag - id1 - Pulling from cristianrgreco/testcontainer",
      "Pulling image:tag - id2 - Pulling from cristianrgreco/testcontainer",
    ]);
  });

  it("should not log image id if not provided", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Pulling from cristianrgreco/testcontainer"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - Pulling from cristianrgreco/testcontainer"]);
  });

  it("should log download progress", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Downloading","progressDetail":{"current":5,"total":10},"progress":"...","id":"id"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - id - Downloading 50%"]);
  });

  it("should round download progress percentage", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Downloading","progressDetail":{"current":3,"total":9},"progress":"...","id":"id"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - id - Downloading 33%"]);
  });

  it("should not log the same download progress twice", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(`{"status":"Downloading","progressDetail":{"current":5,"total":10},"progress":"...","id":"id"}\n`);
    stream.push(`{"status":"Downloading","progressDetail":{"current":5.0001,"total":10},"progress":"...","id":"id"}\n`);
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual(["Pulling image:tag - id - Downloading 50%"]);
  });

  it("should log a single line at a time", async () => {
    const promise = new Promise((resolve) => parser.consume(stream).then(resolve));

    stream.push(
      `{"status":"Downloading","progressDetail":{"current":5,"total":10},"progress":"...","id":"id"}\r{"status":"Downloading","progressDetail":{"current":8,"total":10},"progress":"...","id":"id"}\n`
    );
    stream.push(null);

    stream.destroy();
    await promise;

    expect(logger.traceLogs).toEqual([
      "Pulling image:tag - id - Downloading 50%",
      "Pulling image:tag - id - Downloading 80%",
    ]);
  });
});
