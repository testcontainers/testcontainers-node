import { runInContainer } from "./run-in-container";
import Dockerode from "dockerode";

describe("runInContainer", () => {
  jest.setTimeout(180_000);

  const dockerode = new Dockerode();

  it("should return the command output", async () => {
    const output = await runInContainer(dockerode, "cristianrgreco/testcontainer:1.1.12", ["echo", "hello", "world"]);
    expect(output).toBe("hello world");
  });

  it("should return the command output from stderr", async () => {
    const output = await runInContainer(dockerode, "cristianrgreco/testcontainer:1.1.12", [
      "sh",
      "-c",
      '>&2 echo "hello world"',
    ]);
    expect(output).toBe("hello world");
  });

  it("should return undefined when the container exits without output", async () => {
    const output = await runInContainer(dockerode, "cristianrgreco/testcontainer:1.1.12", ["test"]);
    expect(output).toBe(undefined);
  });
});
