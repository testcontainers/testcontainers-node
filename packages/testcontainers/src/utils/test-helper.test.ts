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

  it.each([
    { type: "image", action: "pull", attribute: "name" },
    { type: "container", action: "start", attribute: "image" },
  ])("should filter $type events by image", async ({ type, action, attribute }) => {
    const eventStream = new PassThrough();
    const image = "cristianrgreco/testcontainer:local";
    const waitPromise = waitForDockerEvent(eventStream, action, 1, image);
    let hasResolved = false;
    waitPromise.then(() => (hasResolved = true));

    eventStream.write(
      `${JSON.stringify({ Type: type, Action: action, Actor: { Attributes: { [attribute]: "other:local" } } })}\n`
    );
    eventStream.write(`${JSON.stringify({ Type: type, Action: action })}\n`);
    await Promise.resolve();
    expect(hasResolved).toBe(false);

    eventStream.write(
      `${JSON.stringify({ Type: type, Action: action, Actor: { Attributes: { [attribute]: `docker.io/${image}` } } })}\n`
    );
    await expect(waitPromise).resolves.toBeUndefined();
  });

  it("should count only matching container starts", async () => {
    const eventStream = new PassThrough();
    const image = "cristianrgreco/testcontainer:local";
    const waitPromise = waitForDockerEvent(eventStream, "start", 2, `docker.io/${image}`);
    let hasResolved = false;
    waitPromise.then(() => (hasResolved = true));

    for (const eventImage of [image, "other:local"]) {
      eventStream.write(
        `${JSON.stringify({ Type: "container", Action: "start", Actor: { Attributes: { image: eventImage } } })}\n`
      );
    }
    await Promise.resolve();
    expect(hasResolved).toBe(false);

    eventStream.write(`${JSON.stringify({ Type: "container", Action: "start", Actor: { Attributes: { image } } })}\n`);
    await expect(waitPromise).resolves.toBeUndefined();
  });
});
