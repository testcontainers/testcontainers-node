import fetch from "node-fetch";
import path from "path";
import getPort from "get-port";
import { GenericContainer } from "./generic-container";
import { AlwaysPullPolicy } from "../pull-policy";
import { Wait } from "../wait";
import { RandomUuid } from "../uuid";
import { checkContainerIsHealthy, getEvents, getRunningContainerNames } from "../test-helper";
import { Network } from "../network";
import { getContainerById } from "../docker/functions/container/get-container";

describe("GenericContainer", () => {
  jest.setTimeout(180_000);

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    await checkContainerIsHealthy(container);

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

  it("should pull an image from a private registry", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer-private:1.1.12")
      .withPullPolicy(new AlwaysPullPolicy())
      .withExposedPorts(8080)
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for log with regex", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage(/Listening on port [0-9]+/))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for a new log after restart", async () => {
    const start = new Date();
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCommand(["/bin/sh", "-c", 'sleep 2; echo "Ready"'])
      .withWaitStrategy(Wait.forLogMessage("Ready"))
      .start();

    expect(new Date().getTime() - start.getTime()).toBeGreaterThanOrEqual(2_000);
    await container.restart();
    expect(new Date().getTime() - start.getTime()).toBeGreaterThanOrEqual(4_000);

    await container.stop();
  });

  it("should wait for health check", async () => {
    const context = path.resolve(fixtures, "docker-with-health-check");
    const customGenericContainer = await GenericContainer.fromDockerfile(context).build();
    const container = await customGenericContainer
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for custom health check", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withHealthCheck({
        test: ["CMD-SHELL", "curl -f http://localhost:8080/hello-world || exit 1"],
        interval: 1000,
        timeout: 3000,
        retries: 5,
        startPeriod: 1000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set network mode", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withNetworkMode("host").start();
    const dockerContainer = await getContainerById(container.getId());
    const containerInfo = await dockerContainer.inspect();

    expect(containerInfo.HostConfig.NetworkMode).toBe("host");

    await container.stop();
  });

  it("should set network aliases", async () => {
    const network = await new Network().start();
    const fooContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .withNetworkAliases("foo")
      .start();
    const barContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withNetwork(network)
      .withNetworkAliases("bar", "baz")
      .start();

    expect((await fooContainer.exec(["getent", "hosts", "bar"])).exitCode).toBe(0);
    expect((await fooContainer.exec(["getent", "hosts", "baz"])).exitCode).toBe(0);
    expect((await barContainer.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
    expect((await barContainer.exec(["getent", "hosts", "unknown"])).exitCode).not.toBe(0);

    await barContainer.stop();
    await fooContainer.stop();
    await network.stop();
  });

  it("should set extra hosts", async () => {
    const fooContainer = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExtraHosts([{ host: "foo", ipAddress: fooContainer.getIpAddress(fooContainer.getNetworkNames()[0]) }])
      .start();

    expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
    expect((await container.exec(["getent", "hosts", "unknown"])).exitCode).not.toBe(0);

    await container.stop();
    await fooContainer.stop();
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

  it("should set ulimits", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withUlimits({ memlock: { hard: -1, soft: -1 } })
      .withExposedPorts(8080)
      .start();

    const { output } = await container.exec(["sh", "-c", "ulimit -l"]);
    expect(output.trim()).toBe("unlimited");

    await container.stop();
  });

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
    expect(containerInfo.HostConfig.LogConfig).toEqual({
      Type: "json-file",
      Config: {},
    });

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
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();
    const events = await getEvents();
    const pullPromise = new Promise<void>((resolve, reject) => {
      events.on("data", (data) => {
        try {
          if (JSON.parse(data).status === "pull") {
            resolve();
          }
        } catch (err) {
          reject(`Unexpected err: ${err}`);
        }
      });
    });

    const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withPullPolicy(new AlwaysPullPolicy())
      .withExposedPorts(8080)
      .start();

    await pullPromise;

    events.destroy();
    await container1.stop();
    await container2.stop();
  });

  it("should execute a command on a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    expect(exitCode).toBe(0);
    expect(output.trim()).toBe("hello world");

    await container.stop();
  });

  it("should stream logs from a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).start();

    const stream = await container.logs();
    const log = await new Promise((resolve) => stream.on("data", (line) => resolve(line)));
    expect(log).toContain("Listening on port 8080");

    await container.stop();
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

    expect(output.trim()).toBe("node");

    await container.stop();
  });

  it("should stop the container when the host port check wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8081)
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError("Port 8081 not bound after 0ms");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should stop the container when the log message wait strategy times out", async () => {
    const containerName = `container-${new RandomUuid().nextUuid()}`;

    await expect(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(containerName)
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("unexpected"))
        .withStartupTimeout(0)
        .start()
    ).rejects.toThrowError(`Log message "unexpected" not received after 0ms`);

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
        .withStartupTimeout(0)
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
        .withHealthCheck({ test: ["CMD-SHELL", "exit 1"] })
        .withWaitStrategy(Wait.forHealthCheck())
        .start()
    ).rejects.toThrowError("Health check failed");

    expect(await getRunningContainerNames()).not.toContain(containerName);
  });

  it("should wait for custom health check using CMD to run the command directly without a shell", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withExposedPorts(8080)
      .withHealthCheck({
        test: ["CMD", "/usr/bin/wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/hello-world"],
        interval: 1000,
        timeout: 3000,
        retries: 5,
        startPeriod: 1000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    await checkContainerIsHealthy(container);

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

  it("should copy file to container", async () => {
    const source = path.resolve(fixtures, "docker", "test.txt");
    const target = "/tmp/test.txt";
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withCopyFilesToContainer([{ source, target }])
      .withExposedPorts(8080)
      .start();
    const { output } = await container.exec(["cat", target]);

    expect(output).toBe("hello world");

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

    expect(output).toBe(content);

    await container.stop();
  });

  describe("reuse", () => {
    it("should not reuse the container by default", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .start();
      await checkContainerIsHealthy(container);

      try {
        await expect(() =>
          new GenericContainer("cristianrgreco/testcontainer:1.1.14")
            .withName("there_can_only_be_one")
            .withExposedPorts(8080)
            .start()
        ).rejects.toThrowError();
      } finally {
        await container.stop();
      }
    });

    it("should not reuse the container even when there is a candidate 1", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container);

      try {
        await expect(() =>
          new GenericContainer("cristianrgreco/testcontainer:1.1.14")
            .withName("there_can_only_be_one")
            .withExposedPorts(8080)
            .start()
        ).rejects.toThrowError();
      } finally {
        await container.stop();
      }
    });

    it("should not reuse the container even when there is a candidate 2", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .start();
      await checkContainerIsHealthy(container);

      try {
        await expect(() =>
          new GenericContainer("cristianrgreco/testcontainer:1.1.14")
            .withName("there_can_only_be_one")
            .withExposedPorts(8080)
            .withReuse()
            .start()
        ).rejects.toThrowError();
      } finally {
        await container.stop();
      }
    });

    it("should reuse the container", async () => {
      const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container1);

      const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container2);

      expect(container1.getId()).toBe(container2.getId());

      await container1.stop();
    });

    it("should create a new container when an existing reusable container has stopped", async () => {
      const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await container1.stop();

      const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container2);

      expect(container1.getId()).not.toBe(container2.getId());
      await container2.stop();
    });

    it("should keep the labels passed in when a new reusable container is created", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("there_can_only_be_one")
        .withExposedPorts(8080)
        .withLabels({ test: "foo", bar: "baz" })
        .withReuse()
        .start();

      expect(container.getLabels()).toEqual(expect.objectContaining({ test: "foo" }));
      await container.stop();
    });

    it("should not create multiple reusable containers if called in parallel", async () => {
      const [container1, container2] = await Promise.all([
        new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
        new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
      ]);

      expect(container1.getId()).toBe(container2.getId());
      await container2.stop();
    });
  });

  describe("from Dockerfile", () => {
    it("should build and start", async () => {
      const context = path.resolve(fixtures, "docker");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);

      await startedContainer.stop();
    });

    it("should use pull policy", async () => {
      const containerSpec = await GenericContainer.fromDockerfile(path.resolve(fixtures, "docker")).withPullPolicy(
        new AlwaysPullPolicy()
      );
      await containerSpec.build();

      const events = await getEvents();
      const pullPromise = new Promise<void>((resolve) => {
        events.on("data", (data) => {
          try {
            const { status } = JSON.parse(data);
            if (status === "pull") {
              resolve();
            }
          } catch {
            // ignored
          }
        });
      });
      await containerSpec.build();

      await pullPromise;

      events.destroy();
    });

    it("should pull an image from a private registry", async () => {
      const context = path.resolve(fixtures, "docker-private");
      const container = await GenericContainer.fromDockerfile(context).withPullPolicy(new AlwaysPullPolicy()).build();
      const startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);

      await startedContainer.stop();
    });

    it("should pull an image from a private registry in a multistage Dockerfile", async () => {
      const context = path.resolve(fixtures, "docker-private-multistage");
      const container = await GenericContainer.fromDockerfile(context).withPullPolicy(new AlwaysPullPolicy()).build();
      const startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);

      await startedContainer.stop();
    });

    it("should build and start with custom file name", async () => {
      const context = path.resolve(fixtures, "docker-with-custom-filename");
      const container = await GenericContainer.fromDockerfile(context, "Dockerfile-A").build();
      const startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);

      await startedContainer.stop();
    });

    it("should set build arguments", async () => {
      const context = path.resolve(fixtures, "docker-with-buildargs");
      const container = await GenericContainer.fromDockerfile(context).withBuildArgs({ VERSION: "10-alpine" }).build();
      const startedContainer = await container.withExposedPorts(8080).start();

      await checkContainerIsHealthy(startedContainer);

      await startedContainer.stop();
    });

    it("should exit immediately and stop without exception", async () => {
      const message = "This container will exit immediately.";
      const context = path.resolve(fixtures, "docker-exit-immediately");
      const container = await GenericContainer.fromDockerfile(context).build();
      const startedContainer = await container.withWaitStrategy(Wait.forLogMessage(message)).start();

      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      await startedContainer.stop();
    });
  });

  describe("restart", () => {
    it("should restart", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("restartingContainer")
        .withExposedPorts(8080)
        .start();
      await checkContainerIsHealthy(container);

      await container.restart();
      await checkContainerIsHealthy(container);

      expect(container.getId()).toStrictEqual(container.getId());
      expect(container.getName()).toStrictEqual(container.getName());

      await container.stop();
    });

    it("should restart persisting state", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName("restartingContainer2")
        .withExposedPorts(8080)
        .start();
      await checkContainerIsHealthy(container);
      await container.exec(["sh", "-c", "echo 'testconfig' >> config.txt"]);

      await container.restart();
      await checkContainerIsHealthy(container);
      const result = await container.exec(["cat", "config.txt"]);

      expect(result.output.trim()).toStrictEqual("testconfig");

      await container.stop();
    });
  });
});
