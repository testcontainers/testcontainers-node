import { createServer, Server } from "http";
import { RandomUniquePortGenerator } from "../utils/port-generator";
import { GenericContainer } from "../generic-container/generic-container";

describe("PortForwarder Reuse", () => {
  jest.setTimeout(180_000);

  let randomPort: number;
  let server: Server;

  afterEach(() => {
    server.close();
    jest.resetModules();
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

async function createTestServer(port: number): Promise<Server> {
  return await new Promise<Server>((resolve) => {
    const server = createServer((req, res) => {
      res.writeHead(200);
      res.end("hello world");
    });
    server.listen(port, () => resolve(server));
  });
}
