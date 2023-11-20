import Dockerode from "dockerode";
import { DockerContainerClient } from "./docker-container-client";

describe("DockerContainerClient", () => {
  jest.setTimeout(180_000);

  it("should stream logs with ContainerLogsOptions from a started container by containerClient", async () => {
    const dockerode = new Dockerode();
    const containerClient = new DockerContainerClient(dockerode);
    const currentYear = new Date().getFullYear().toString();
    const container = await dockerode.createContainer({Image: "cristianrgreco/testcontainer:1.1.14"});

    await container.start();

    const stream = await containerClient.logs(container, {timestamps: true});
    const log: string = await new Promise((resolve) => stream.on("data", (line: string) => resolve(line)));

    expect(log.startsWith(currentYear)).toBe(true);

    await container.stop();
  });
});
