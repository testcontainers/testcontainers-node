import fetch from "node-fetch";
import path from "path";
import { DockerComposeEnvironment, StartedDockerComposeEnvironment } from "./docker-compose-environment";

describe("DockerComposeEnvironment", () => {
  const fixtures = path.resolve(__dirname, "..", "fixtures", "docker-compose");

  let managedEnvironments: StartedDockerComposeEnvironment[] = [];
  const manageEnvironment = (environment: StartedDockerComposeEnvironment): StartedDockerComposeEnvironment => {
    managedEnvironments.push(environment);
    return environment;
  };

  afterEach(async () => {
    await Promise.all(managedEnvironments.map(async environment => await environment.down()));
    managedEnvironments = [];
  });

  it("should throw error when compose file is malformed", async () => {
    try {
      manageEnvironment(await new DockerComposeEnvironment(fixtures, "docker-compose-malformed.yml").up());
      fail();
    } catch (err) {
      expect(err.message).toContain(`Version in "./docker-compose-malformed.yml" is invalid - it should be a string.`);
    }
  });

  it("should throw error when compose file fails to start", async () => {
    try {
      manageEnvironment(await new DockerComposeEnvironment(fixtures, "docker-compose-port-error.yml").up());
      fail();
    } catch (err) {
      expect(err.message).toContain("Cannot start service");
    }
  });

  it("should start all containers in the compose file", async () => {
    const startedEnvironment = manageEnvironment(
      await new DockerComposeEnvironment(fixtures, "docker-compose.yml").up()
    );

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
