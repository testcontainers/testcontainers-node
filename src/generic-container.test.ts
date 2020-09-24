import Dockerode from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import fetch from "node-fetch";
import path from "path";
import { GenericContainer } from "./generic-container";
import { AlwaysPullPolicy } from "./pull-policy";
import { Wait } from "./wait";
import { Readable } from "stream";
import { RandomUuid } from "./uuid";

describe("GenericContainer", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "fixtures");
  const dockerodeClient = new Dockerode();

  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
    await container.stop();
  });

  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
    await container.stop();
  });

  it("should wait for health check", async () => {
    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    const container = await customGenericContainer
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
    await container.stop();
  });

  it("should wait for custom health check", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .withHealthCheck({
        test: "curl -f http://localhost:8080/hello-world || exit 1",
        interval: new Duration(1, TemporalUnit.SECONDS),
        timeout: new Duration(3, TemporalUnit.SECONDS),
        retries: 5,
        startPeriod: new Duration(1, TemporalUnit.SECONDS),
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
    await container.stop();
  });

  it("should set network mode", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withNetworkMode("host")
      .start();
    const dockerContainer = dockerodeClient.getContainer(container.getId());

    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.NetworkMode).toBe("host");
    await container.stop();
  });

  it("should set environment variables", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withEnv("customKey", "customValue")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();

    expect(responseBody.customKey).toBe("customValue");
    await container.stop();
  });

  it("should set command", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withCmd(["node", "index.js", "one", "two", "three"])
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/cmd`);
    const responseBody = await response.json();

    expect(responseBody).toEqual(["/usr/local/bin/node", "/index.js", "one", "two", "three"]);
    await container.stop();
  });

  it("should set name", async () => {
    const containerName = "special-test-container";
    const expectedContainerName = "/special-test-container";

    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withName(containerName)
      .start();

    expect(container.getName()).toEqual(expectedContainerName);
    await container.stop();
  });

  it("should set bind mounts", async () => {
    const filename = "test.txt";
    const source = path.resolve(fixtures, "docker", filename);
    const target = `/tmp/${filename}`;

    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withBindMount(source, target)
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["cat", target]);
    expect(output).toContain("hello world");

    await container.stop();
  });

  it("should set tmpfs", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withTmpFs({ "/testtmpfs": "rw" })
      .withExposedPorts(8080)
      .start();

    const tmpFsFile = "/testtmpfs/test.file";

    const { exitCode: exitCode1 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode1).toBe(1);

    await container.exec(["touch", tmpFsFile]);
    const { exitCode: exitCode2 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode2).toBe(0);

    await container.stop();
  });

  it("should set default log driver", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withDefaultLogDriver()
      .start();
    const dockerContainer = dockerodeClient.getContainer(container.getId());

    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.LogConfig).toEqual({
      Type: "json-file",
      Config: {},
    });
    await container.stop();
  });

  it("should set privileged mode", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withPrivilegedMode()
      .withExposedPorts(8080)
      .start();
    const dockerContainer = dockerodeClient.getContainer(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.Privileged).toBe(true);

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await container.stop();
  });

  it("should use pull policy", async () => {
    const container1 = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .start();

    const events = (await dockerodeClient.getEvents()).setEncoding("utf-8") as Readable;

    const container2 = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withPullPolicy(new AlwaysPullPolicy())
      .withExposedPorts(8080)
      .start();

    const statuses = await new Promise((resolve) => {
      const eventStatuses: string[] = [];
      events.on("data", (data) => {
        const status = JSON.parse(data).status;
        eventStatuses.push(status);
        if (status === "create") {
          resolve(eventStatuses);
        }
      });
    });

    expect(statuses).toContain("pull");

    events.destroy();
    await container1.stop();
    await container2.stop();
  });

  it("should execute a command on a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .start();

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    expect(exitCode).toBe(0);
    expect(output).toContain("hello world");

    await container.stop();
  });

  it("should stream logs from a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
      .withExposedPorts(8080)
      .start();

    const stream = await container.logs();
    const log = await new Promise((resolve) => stream.on("data", (line) => resolve(line)));

    expect(log).toContain("Listening on port 8080");
    await container.stop();
  });

  it("should stop the container when the host port check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHealthCheck())
        .withStartupTimeout(new Duration(0, TemporalUnit.MILLISECONDS))
        .start()
    ).rejects.toThrowError("Health check not healthy after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should stop the container when the log message wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("unexpected"))
        .withStartupTimeout(new Duration(0, TemporalUnit.MILLISECONDS))
        .start()
    ).rejects.toThrowError("Health check not healthy after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should stop the container when the health check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    await expect(
      customGenericContainer
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHealthCheck())
        .withStartupTimeout(new Duration(0, TemporalUnit.MILLISECONDS))
        .start()
    ).rejects.toThrowError("Health check not healthy after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should stop the container when the health check fails", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    await expect(
      customGenericContainer
        .withName(containerName)
        .withExposedPorts(8080)
        .withHealthCheck({ test: "exit 1" })
        .withWaitStrategy(Wait.forHealthCheck())
        .start()
    ).rejects.toThrowError("Health check failed");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should honour .dockerignore file", async () => {
    const context = path.resolve(fixtures, "docker-with-dockerignore");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    const { output } = await startedContainer.exec(["find"]);

    expect(output).toContain("exist1.txt");
    expect(output).toContain("exist2.txt");
    expect(output).not.toContain("example1.txt");
    expect(output).not.toContain("example2.txt");
    expect(output).not.toContain("example3.txt");
    expect(output).not.toContain("example4.txt");
    expect(output).not.toContain("example5.txt");
    expect(output).not.toContain("example6.txt");

    await startedContainer.stop();
  });

  describe("from Dockerfile", () => {
    it("should build and start", async () => {
      const context = path.resolve(fixtures, "docker");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = await container.withExposedPorts(8080).start();

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
      await startedContainer.stop();
    });

    it("should build and start with custom file name", async () => {
      const context = path.resolve(__dirname, "..", "fixtures", "docker-with-custom-filename");
      const container = await GenericContainer.fromDockerfile(context, "Dockerfile-A").build();
      const startedContainer = await container.withExposedPorts(8080).start();

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
      await startedContainer.stop();
    });

    it("should set build arguments", async () => {
      const context = path.resolve(fixtures, "docker-with-buildargs");
      const container = await GenericContainer.fromDockerfile(context).withBuildArg("VERSION", "10-alpine").build();
      const startedContainer = await container.withExposedPorts(8080).start();

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
      await startedContainer.stop();
    });

    it("should exit immediately and stop without exception", async () => {
      const message = "This container will exit immediately.";
      const context = path.resolve(fixtures, "docker-exit-immediately");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = await container.withWaitStrategy(Wait.forLogMessage(message)).start();

      await new Promise((res) => setTimeout(res, 1000));

      await startedContainer.stop();
    });
  });

  const getRunningContainerNames = async (): Promise<string[]> => {
    const containers = await dockerodeClient.listContainers();
    return containers
      .map((container) => container.Names)
      .reduce((result, containerNames) => [...result, ...containerNames], [])
      .map((containerName) => containerName.replace("/", ""));
  };
});
