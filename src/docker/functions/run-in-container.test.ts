import { runInContainer } from "./run-in-container";
import { getDockerClient } from "../client/docker-client";
import Dockerode from "dockerode";

describe("runInContainer", () => {
  jest.setTimeout(180_000);

  let dockerode: Dockerode;

  beforeAll(async () => {
    dockerode = (await getDockerClient()).dockerode;
  });

  it("should return the command output", async () => {
    const output = await runInContainer(
      dockerode,
      "https://index.docker.io/v1/",
      "cristianrgreco/testcontainer:1.1.14",
      ["echo", "hello", "world"]
    );
    expect(output).toBe("hello world");
  });

  it("should return the command output from stderr", async () => {
    const output = await runInContainer(
      dockerode,
      "https://index.docker.io/v1/",
      "cristianrgreco/testcontainer:1.1.14",
      ["sh", "-c", '>&2 echo "hello world"']
    );
    expect(output).toBe("hello world");
  });

  it("should return undefined when the container exits without output", async () => {
    const output = await runInContainer(
      dockerode,
      "https://index.docker.io/v1/",
      "cristianrgreco/testcontainer:1.1.14",
      ["test"]
    );
    expect(output).toBe(undefined);
  });
});
