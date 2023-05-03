import fetch from "node-fetch";
import path from "path";
import getPort from "get-port";
import { GenericContainer } from "./generic-container";
import { AlwaysPullPolicy } from "../pull-policy";
import {
  checkContainerIsHealthy,
  getDockerEventStream,
  getRunningContainerNames,
  waitForDockerEvent,
} from "../test-helper";
import { getContainerById } from "../docker/functions/container/get-container";
import { RandomUuid } from "../uuid";

describe("GenericContainer", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should return first mapped port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    expect(container.getFirstMappedPort()).toBe(container.getMappedPort(8080));

    await container.stop();
  });

  it("should bind to specified host port", async () => {
    const hostPort = await getPort();
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts({
        container: 8080,
        host: hostPort,
      })
      .start();

    await checkContainerIsHealthy(container);
    expect(container.getMappedPort(8080)).toBe(hostPort);

    await container.stop();
  });

  it("should execute a command on a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    expect(exitCode).toBe(0);
    expect(output).toEqual(expect.stringContaining("hello world"));

    await container.stop();
  });

  it("should set environment variables", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withEnvironment({ customKey: "customValue" })
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();
    expect(responseBody.customKey).toBe("customValue");

    await container.stop();
  });

  it("should set command", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand(["node", "index.js", "one", "two", "three"])
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/cmd`);
    const responseBody = await response.json();
    expect(responseBody).toEqual(["/usr/local/bin/node", "/index.js", "one", "two", "three"]);

    await container.stop();
  });

  it("should set working directory", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withWorkingDir("/tmp")
      .withCommand(["node", "../index.js"])
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["pwd"]);
    expect(output).toEqual(expect.stringContaining("/tmp"));
  });

  it("should set entrypoint", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withEntrypoint(["node"])
      .withCommand(["index.js"])
      .withExposedPorts(8080)
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set name", async () => {
    const containerName = "special-test-container";
    const expectedContainerName = "/special-test-container";
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withName(containerName).start();

    expect(container.getName()).toEqual(expectedContainerName);

    await container.stop();
  });

  it("should set label", async () => {
    const labels = {
      ["label-1"]: "value-1",
      ["label-2"]: "value-2",
    };

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withLabels(labels).start();

    expect(container.getLabels()).toMatchObject(labels);

    await container.stop();
  });

  it("should set bind mounts", async () => {
    const filename = "test.txt";
    const source = path.resolve(fixtures, "docker", filename);
    const target = `/tmp/${filename}`;

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withBindMounts([{ source, target }])
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["cat", target]);
    expect(output).toContain("hello world");

    await container.stop();
  });

  it("should set tmpfs", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
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

  if (!process.env["CI_ROOTLESS"]) {
    it("should set ulimits", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withUlimits({ memlock: { hard: -1, soft: -1 } })
        .withExposedPorts(8080)
        .start();

      const { output } = await container.exec(["sh", "-c", "ulimit -l"]);
      expect(output.trim()).toBe("unlimited");

      await container.stop();
    });
  }

  it("should add capabilities", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withAddedCapabilities("IPC_LOCK")
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["sh", "-c", "getpcaps 1 2>&1"]);
    expect(output).toContain("cap_ipc_lock");

    await container.stop();
  });

  it("should drop capabilities", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withDroppedCapabilities("CHOWN")
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["sh", "-c", "getpcaps 1 2>&1"]);
    expect(output).not.toContain("cap_chown");

    await container.stop();
  });

  it("should set default log driver", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withDefaultLogDriver().start();

    const dockerContainer = await getContainerById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.LogConfig).toEqual(
      expect.objectContaining({
        Type: "json-file",
      })
    );

    await container.stop();
  });

  it("should set privileged mode", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withPrivilegedMode()
      .withExposedPorts(8080)
      .start();

    const dockerContainer = await getContainerById(container.getId());
    const containerInfo = await dockerContainer.inspect();
    expect(containerInfo.HostConfig.Privileged).toBe(true);
    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should use pull policy", async () => {
    const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080);

    const startedContainer1 = await container.start();
    const dockerEventStream = await getDockerEventStream();
    const dockerPullEventPromise = waitForDockerEvent(dockerEventStream, "pull");
    const startedContainer2 = await container.withPullPolicy(new AlwaysPullPolicy()).start();
    await dockerPullEventPromise;

    dockerEventStream.destroy();
    await startedContainer1.stop();
    await startedContainer2.stop();
  });

  it("should set the IPC mode", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withIpcMode("host")
      .withExposedPorts(8080)
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set the user", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withUser("node")
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["whoami"]);

    expect(output).toEqual(expect.stringContaining("node"));

    await container.stop();
  });

  it("should copy file to container", async () => {
    const source = path.resolve(fixtures, "docker", "test.txt");
    const target = "/tmp/test.txt";
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCopyFilesToContainer([{ source, target }])
      .withExposedPorts(8080)
      .start();
    const { output } = await container.exec(["cat", target]);

    expect(output).toEqual(expect.stringContaining("hello world"));

    await container.stop();
  });

  it("should copy content to container", async () => {
    const content = "hello world";
    const target = "/tmp/test.txt";
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCopyContentToContainer([{ content, target }])
      .withExposedPorts(8080)
      .start();
    const { output } = await container.exec(["cat", target]);

    expect(output).toEqual(expect.stringContaining(content));

    await container.stop();
  });

  it("should honour .dockerignore file", async () => {
    const context = path.resolve(fixtures, "docker-with-dockerignore");
    const container = await GenericContainer.fromDockerfile(context).build();
    const startedContainer = await container.withExposedPorts(8080).start();

    const { output } = await startedContainer.exec(["find"]);

    expect(output).toContain("exist1.txt");
    expect(output).toContain("exist2.txt");
    expect(output).toContain("exist7.txt");
    expect(output).not.toContain("example1.txt");
    expect(output).not.toContain("example2.txt");
    expect(output).not.toContain("example3.txt");
    expect(output).not.toContain("example4.txt");
    expect(output).not.toContain("example5.txt");
    expect(output).not.toContain("example6.txt");
    expect(output).not.toContain("example7.txt");
    expect(output).not.toContain("Dockerfile");

    await startedContainer.stop();
  });

  it("should stop the container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .start();

    await container.stop();

    expect(await getRunningContainerNames()).not.toContain(container.getName());
  });

  it("should stop the container idempotently", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .start();

    const stopContainerPromises = Promise.all(
      Array(5)
        .fill(0)
        .map(() => container.stop())
    );

    await expect(stopContainerPromises).resolves.not.toThrow();
    expect(await getRunningContainerNames()).not.toContain(container.getName());
  });
});
