import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUuid } from "../common/uuid";
import { Network } from "../network/network";
import type { StartedTestContainer } from "../test-container";
import { TestContainers } from "../test-containers";
import { RandomPortGenerator } from "../utils/port-generator";
import { checkContainerIsHealthy } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer reuse", { concurrent: false, timeout: 180_000 }, () => {
  it("should not reuse the container by default", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withName(name).withExposedPorts(8080).start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container even when there is a candidate 1", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withName(name).withExposedPorts(8080).start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container even when there is a candidate 2", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start()
    ).rejects.toThrowError();
  });

  it("should not reuse the container when TESTCONTAINERS_REUSE_ENABLE is set to false", async () => {
    vi.stubEnv("TESTCONTAINERS_REUSE_ENABLE", "false");

    const name = `there_can_only_be_one_${randomUuid()}`;
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container);

    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start()
    ).rejects.toThrowError();
  });

  it.each(["true", undefined])(
    "should reuse the container when TESTCONTAINERS_REUSE_ENABLE is set to %s",
    async (reuseEnable: string | undefined) => {
      vi.stubEnv("TESTCONTAINERS_REUSE_ENABLE", reuseEnable);

      const name = `there_can_only_be_one_${randomUuid()}`;
      await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container1);

      const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withName(name)
        .withExposedPorts(8080)
        .withReuse()
        .start();
      await checkContainerIsHealthy(container2);

      expect(container1.getId()).toBe(container2.getId());
    }
  );

  it("should create a new container when an existing reusable container has stopped and is removed", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop();

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).not.toBe(container2.getId());
  });

  it("should reuse stopped container, if configured withAutoRemove(false)", async () => {
    const name = `will_stop_and_reuse_again_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .withAutoRemove(false)
      .start();
    await container1.stop({ timeout: 10000 });

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop({ remove: true });
  });

  it("should reuse container when an existing reusable container has stopped but not removed", async () => {
    const name = `there_can_only_be_one_${randomUuid()}`;
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop({ remove: false, timeout: 10000 });

    await using container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(name)
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop();
  });

  it("should keep the labels passed in when a new reusable container is created", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName(`there_can_only_be_one_${randomUuid()}`)
      .withExposedPorts(8080)
      .withLabels({ test: "foo", bar: "baz" })
      .withReuse()
      .start();

    expect(container.getLabels()).toEqual(expect.objectContaining({ test: "foo" }));
  });

  it.each<[string, (container: GenericContainer) => GenericContainer]>([
    ["tmpfs", (container) => container.withTmpFs({ "/data": "rw" })],
    ["privileged mode", (container) => container.withPrivilegedMode()],
    ["extra host", (container) => container.withExtraHosts([{ host: "foo", ipAddress: "10.0.0.1" }])],
    [
      "bind mount",
      (container) =>
        container.withBindMounts([
          {
            source: path.resolve(__dirname, "..", "..", "fixtures", "docker", "docker", "test.txt"),
            target: "/tmp/test.txt",
          },
        ]),
    ],
    [
      "copied content",
      (container) => container.withCopyContentToContainer([{ content: "second", target: "/tmp/marker.txt" }]),
    ],
  ])("should not reuse the container when the %s differs", async (_, configure) => {
    const labels = { "reuse-test": randomUuid() };
    await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withLabels(labels)
      .withExposedPorts(8080)
      .withReuse()
      .start();

    const container2 = await configure(
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withLabels(labels).withExposedPorts(8080).withReuse()
    ).start();
    stopUnlessReused(container2, container1);

    expect(container2.getId()).not.toBe(container1.getId());
  });

  it("should not reuse the container when the network aliases differ", async () => {
    const labels = { "reuse-test": randomUuid() };
    const network = await new Network().start();
    onTestFinished(async () => {
      await network.stop();
    });
    await using container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withLabels(labels)
      .withNetwork(network)
      .withNetworkAliases("foo")
      .withReuse()
      .start();

    const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withLabels(labels)
      .withNetwork(network)
      .withNetworkAliases("bar")
      .withReuse()
      .start();
    stopUnlessReused(container2, container1);

    expect(container2.getId()).not.toBe(container1.getId());
  });

  it("should reuse the container when the host config and copied content are the same", async () => {
    const labels = { "reuse-test": randomUuid() };
    const createContainer = () =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withLabels(labels)
        .withExposedPorts(8080)
        .withTmpFs({ "/data": "rw" })
        .withCopyContentToContainer([{ content: "first", target: "/tmp/marker.txt" }])
        .withReuse();
    await using container1 = await createContainer().start();

    const container2 = await createContainer().start();
    stopUnlessReused(container2, container1);

    expect(container2.getId()).toBe(container1.getId());
  });

  it.each<[string, (container: GenericContainer, directory: string) => GenericContainer]>([
    [
      "file",
      (container, directory) =>
        container.withCopyFilesToContainer([
          { source: path.join(directory, "nested", "marker.txt"), target: "/tmp/marker.txt" },
        ]),
    ],
    [
      "directory",
      (container, directory) =>
        container.withCopyDirectoriesToContainer([{ source: directory, target: "/tmp/markers" }]),
    ],
  ])("should reuse the container only while the content of the copied %s is the same", async (_, copy) => {
    const labels = { "reuse-test": randomUuid() };
    const directory = await fs.mkdtemp(path.join(tmpdir(), "testcontainers-"));
    const marker = path.join(directory, "nested", "marker.txt");
    await fs.mkdir(path.dirname(marker));
    await fs.writeFile(marker, "first");
    const createContainer = () =>
      copy(
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withLabels(labels)
          .withExposedPorts(8080)
          .withReuse(),
        directory
      );

    try {
      await using container1 = await createContainer().start();
      const container2 = await createContainer().start();
      stopUnlessReused(container2, container1);
      expect(container2.getId()).toBe(container1.getId());

      await fs.writeFile(marker, "other");
      const container3 = await createContainer().start();
      stopUnlessReused(container3, container1);
      expect(container3.getId()).not.toBe(container1.getId());
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("should copy stream content into a reusable container and reuse it", async () => {
    const labels = { "reuse-test": randomUuid() };
    const createContainer = () =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withLabels(labels)
        .withExposedPorts(8080)
        .withCopyContentToContainer([{ content: Readable.from(["first"]), target: "/tmp/marker.txt" }])
        .withReuse();
    await using container1 = await createContainer().start();

    const container2 = await createContainer().start();
    stopUnlessReused(container2, container1);

    expect(container2.getId()).toBe(container1.getId());
    expect((await container1.exec(["cat", "/tmp/marker.txt"])).output).toBe("first");
  });

  it("should not create multiple reusable containers if called in parallel", async () => {
    const [container1, container2] = await Promise.all([
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
    ]);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop();
  });

  // Must run last: exposing host ports keeps the port forwarder running for the rest of the file.
  describe("when host ports are exposed", () => {
    it("should keep the reuse hash of a container created before host ports were exposed", async () => {
      const labels = { "reuse-test": randomUuid() };
      const createContainer = () =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withLabels(labels)
          .withExposedPorts(8080)
          .withExtraHosts([{ host: "foo", ipAddress: "10.0.0.1" }])
          .withReuse();
      await using container1 = await createContainer().start();

      await TestContainers.exposeHostPorts(await new RandomPortGenerator().generatePort());
      const container2 = await createContainer().start();
      stopUnlessReused(container2, container1);

      expect(container2.getId()).toBe(container1.getId());
    });
  });
});

function stopUnlessReused(container: StartedTestContainer, reusedContainer: StartedTestContainer) {
  onTestFinished(async () => {
    if (container.getId() !== reusedContainer.getId()) {
      await container.stop();
    }
  });
}
