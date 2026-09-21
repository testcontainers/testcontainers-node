import { PassThrough } from "stream";
import { waitForDockerEvent } from "./test-helper";

describe("waitForDockerEvent", () => {
  it("should resolve when action matches in ndjson stream", async () => {
    const eventStream = new PassThrough();
    const waitPromise = waitForDockerEvent(eventStream, "pull");

    eventStream.write('{"Action":"create"}\n{"Action":"pull"}\n');

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it("should resolve when status matches in ndjson stream", async () => {
    const eventStream = new PassThrough();
    const waitPromise = waitForDockerEvent(eventStream, "pull");

    eventStream.write('{"status":"pull"}\n');

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it("should resolve when action matches in json-seq stream", async () => {
    const eventStream = new PassThrough();
    const waitPromise = waitForDockerEvent(eventStream, "pull");

    eventStream.write('\u001e{"Action":"pull"}\n');

    await expect(waitPromise).resolves.toBeUndefined();
  });
});
