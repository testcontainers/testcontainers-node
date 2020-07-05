import fetch from "node-fetch";
import path from "path";
import { DockerComposeEnvironment } from "./docker-compose-environment";

describe("DockerComposeEnvironment", () => {
  const fixtures = path.resolve(__dirname, "..", "fixtures", "docker-compose");

  it("should throw error when compose file is malformed", async () => {
    await expect(new DockerComposeEnvironment(fixtures, "docker-compose-malformed.yml").start()).rejects.toThrowError(
      `Version in "./docker-compose-malformed.yml" is invalid - it should be a string.`
    );
  });

  it("should throw error when compose file fails to start", async () => {
    try {
      await new DockerComposeEnvironment(fixtures, "docker-compose-port-error.yml").start();
      fail();
    } catch (err) {
      expect(err.message).toContain("Bind for 0.0.0.0:8080 failed: port is already allocated");
    }
  });

  it("should start all containers in the compose file", async () => {
    const startedEnvironment = await new DockerComposeEnvironment(fixtures, "docker-compose.yml").start();

    const containerNames = ["container_1", "another_container_1"];
    await Promise.all(
      containerNames.map(async containerName => {
        const containerIpAddress = startedEnvironment.getContainerIpAddress(containerName);
        const containerPort = startedEnvironment.getMappedPort(containerName, 8080);
        const url = `http://${containerIpAddress}:${containerPort}`;
        const response = await fetch(`${url}/hello-world`);
        expect(response.status).toBe(200);
      })
    );
  });
});
