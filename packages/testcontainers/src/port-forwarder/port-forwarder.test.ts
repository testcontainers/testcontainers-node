import { createServer, Server } from "http";
import { GenericContainer } from "../generic-container/generic-container";
import { Network } from "../network/network";
import { TestContainers } from "../test-containers";
import { RandomUniquePortGenerator } from "../utils/port-generator";

describe("PortForwarder", { timeout: 180_000 }, () => {
  let randomPort: number;
  let server: Server;

  afterEach(() => {
    server.close();
  });

  describe("Behaviour", () => {
    beforeEach(async () => {
      randomPort = await new RandomUniquePortGenerator().generatePort();
      server = await createTestServer(randomPort);
    });

    it("should expose host ports to the container", async () => {
      await TestContainers.exposeHostPorts(randomPort);

      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

      const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
      expect(output).toEqual(expect.stringContaining("hello world"));

      await container.stop();
    });

    it("should expose host ports to the container with custom network", async () => {
      await TestContainers.exposeHostPorts(randomPort);

      const network = await new Network().start();
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withNetwork(network).start();

      const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
      expect(output).toEqual(expect.stringContaining("hello world"));

      await container.stop();
      await network.stop();
    });

    it("should expose host ports to the container with custom network and network alias", async () => {
      await TestContainers.exposeHostPorts(randomPort);

      const network = await new Network().start();
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withNetwork(network)
        .withNetworkAliases("foo")
        .start();

      const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
      expect(output).toEqual(expect.stringContaining("hello world"));

      await container.stop();
      await network.stop();
    });
  });

  describe("Reuse", () => {
    afterEach(() => {
      vi.resetModules();
    });

    describe("Different host ports", () => {
      beforeEach(async () => {
        randomPort = await new RandomUniquePortGenerator().generatePort();
        server = await createTestServer(randomPort);
      });

      it("1", async () => {
        const { TestContainers } = await import("../test-containers");
        await TestContainers.exposeHostPorts(randomPort);

        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

        const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
        expect(output).toEqual(expect.stringContaining("hello world"));

        await container.stop();
      });

      it("2", async () => {
        const { TestContainers } = await import("../test-containers");
        await TestContainers.exposeHostPorts(randomPort);

        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

        const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
        expect(output).toEqual(expect.stringContaining("hello world"));

        await container.stop();
      });
    });

    describe("Same host ports", () => {
      beforeAll(async () => {
        randomPort = await new RandomUniquePortGenerator().generatePort();
      });

      beforeEach(async () => {
        server = await createTestServer(randomPort);
      });

      it("1", async () => {
        const { TestContainers } = await import("../test-containers");
        await TestContainers.exposeHostPorts(randomPort);

        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

        const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
        expect(output).toEqual(expect.stringContaining("hello world"));

        await container.stop();
      });

      it("2", async () => {
        const { TestContainers } = await import("../test-containers");
        await TestContainers.exposeHostPorts(randomPort);

        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

        const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
        expect(output).toEqual(expect.stringContaining("hello world"));

        await container.stop();
      });
    });
  });
});

async function createTestServer(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end("hello world");
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return server;
}
