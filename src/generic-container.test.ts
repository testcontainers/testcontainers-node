import Dockerode from "dockerode";
import { Duration, TemporalUnit } from "node-duration";
import fetch from "node-fetch";
import path from "path";
import { GenericContainer } from "./generic-container";
import { AlwaysPullPolicy } from "./pull-policy";
import { StartedTestContainer } from "./test-container";
import { Wait } from "./wait";

describe("GenericContainer", () => {
  jest.setTimeout(45000);

  let managedContainers: StartedTestContainer[] = [];
  let managedStreams: NodeJS.ReadableStream[] = [];

  const dockerodeClient = new Dockerode();

  const managedContainer = (container: StartedTestContainer): StartedTestContainer => {
    managedContainers.push(container);
    return container;
  };

  const managedStream = (stream: NodeJS.ReadableStream): NodeJS.ReadableStream => {
    managedStreams.push(stream);
    return stream;
  };

  afterEach(async () => {
    await Promise.all(managedContainers.map(container => container.stop()));
    managedContainers = [];

    await Promise.all(
      managedStreams.map(stream => {
        // @ts-ignore
        return stream.destroy();
      })
    );
    managedStreams = [];
  });

  it("should wait for port", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withExposedPorts(8080).start()
    );

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
  });

  it("should wait for log", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
        .start()
    );
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;

    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
  });

  it("should wait for health check", async () => {
    const context = path.resolve(__dirname, "..", "fixtures", "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    const container = managedContainer(
      await customGenericContainer
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHealthCheck())
        .start()
    );
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;

    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
  });

  it("should wait for custom health check", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withExposedPorts(8080)
        .withHealthCheck({
          test: "curl -f http://localhost:8080/hello-world || exit 1",
          interval: new Duration(1, TemporalUnit.SECONDS),
          timeout: new Duration(3, TemporalUnit.SECONDS),
          retries: 5,
          startPeriod: new Duration(1, TemporalUnit.SECONDS)
        })
        .withWaitStrategy(Wait.forHealthCheck())
        .start()
    );
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;

    const response = await fetch(`${url}/hello-world`);

    expect(response.status).toBe(200);
  });

  it("should set network mode", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withNetworkMode("host").start()
    );
    const dockerContainer = dockerodeClient.getContainer(container.getId());

    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.NetworkMode).toBe("host");
  });

  it("should set environment variables", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withEnv("customKey", "customValue")
        .withExposedPorts(8080)
        .start()
    );
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;

    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();

    expect(responseBody.customKey).toBe("customValue");
  });

  it("should set command", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withCmd(["node", "index.js", "one", "two", "three"])
        .withExposedPorts(8080)
        .start()
    );
    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;

    const response = await fetch(`${url}/cmd`);
    const responseBody = await response.json();

    expect(responseBody).toEqual(["/usr/local/bin/node", "/index.js", "one", "two", "three"]);
  });

  it("should set name", async () => {
    const containerName = "special-test-container";
    const expectedContainerName = "/special-test-container";

    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withName(containerName).start()
    );

    expect(container.getName()).toEqual(expectedContainerName);
  });

  it("should set bind mounts", async () => {
    const filename = "test.txt";
    const source = path.resolve(__dirname, "..", "fixtures", "docker", filename);
    const target = `/tmp/${filename}`;

    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withBindMount(source, target)
        .withExposedPorts(8080)
        .start()
    );

    const { output } = await container.exec(["cat", target]);
    expect(output).toContain("hello world");
  });

  it("should set tmpfs", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withTmpFs({ "/testtmpfs": "rw" })
        .withExposedPorts(8080)
        .start()
    );

    const tmpFsFile = "/testtmpfs/test.file";

    const { exitCode: exitCode1 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode1).toBe(1);

    await container.exec(["touch", tmpFsFile]);
    const { exitCode: exitCode2 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode2).toBe(0);
  });

  it("should set default log driver", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withDefaultLogDriver().start()
    );
    const dockerContainer = dockerodeClient.getContainer(container.getId());

    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.LogConfig).toEqual({
      Type: "json-file",
      Config: {}
    });
  });

  it("should set privileged mode", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withPrivilegedMode()
        .withExposedPorts(8080)
        .start()
    );
    const dockerContainer = dockerodeClient.getContainer(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.Privileged).toBe(true);

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);
  });

  it("should use pull policy", async () => {
    managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withExposedPorts(8080).start()
    );

    const events = managedStream(await dockerodeClient.getEvents());
    events.setEncoding("utf-8");

    managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12")
        .withPullPolicy(new AlwaysPullPolicy())
        .withExposedPorts(8080)
        .start()
    );

    const statuses = await new Promise(resolve => {
      const eventStatuses: string[] = [];
      events.on("data", data => {
        const status = JSON.parse(data).status;
        eventStatuses.push(status);
        if (status === "create") {
          resolve(eventStatuses);
        }
      });
    });

    expect(statuses).toContain("pull");
  });

  it("should execute a command on a running container", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withExposedPorts(8080).start()
    );

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    expect(exitCode).toBe(0);
    expect(output).toContain("hello world");
  });

  it("should stream logs from a running container", async () => {
    const container = managedContainer(
      await new GenericContainer("cristianrgreco/testcontainer", "1.1.12").withExposedPorts(8080).start()
    );

    const log = await new Promise(async resolve => {
      const stream = await container.logs();
      stream.on("data", line => resolve(line));
    });

    expect(log).toContain("Listening on port 8080");
  });

  it("should honour .dockerignore file", async () => {
    const context = path.resolve(__dirname, "..", "fixtures", "docker-with-dockerignore");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = managedContainer(await container.withExposedPorts(8080).start());

    const { output } = await startedContainer.exec(["find"]);

    expect(output).toContain("exist1.txt");
    expect(output).toContain("exist2.txt");
    expect(output).not.toContain("example1.txt");
    expect(output).not.toContain("example2.txt");
    expect(output).not.toContain("example3.txt");
    expect(output).not.toContain("example4.txt");
    expect(output).not.toContain("example5.txt");
    expect(output).not.toContain("example6.txt");
  });

  describe("from Dockerfile", () => {
    it("should build and start", async () => {
      const context = path.resolve(__dirname, "..", "fixtures", "docker");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = managedContainer(await container.withExposedPorts(8080).start());

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
    });

    it("should build and start with custom file name", async () => {
      const context = path.resolve(__dirname, "..", "fixtures", "docker-with-custom-filename");
      const container = await GenericContainer.fromDockerfile(context, "Dockerfile-A").build();
      const startedContainer = managedContainer(await container.withExposedPorts(8080).start());

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
    });

    it("should set build arguments", async () => {
      const context = path.resolve(__dirname, "..", "fixtures", "docker-with-buildargs");
      const container = await GenericContainer.fromDockerfile(context)
        .withBuildArg("VERSION", "10-alpine")
        .build();
      const startedContainer = managedContainer(await container.withExposedPorts(8080).start());

      const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
      const response = await fetch(`${url}/hello-world`);

      expect(response.status).toBe(200);
    });
  });
});
