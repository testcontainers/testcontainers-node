import { createServer, Server } from "http";
import { RandomUniquePortGenerator } from "../utils/port-generator";
import { GenericContainer } from "../generic-container/generic-container";

describe("PortForwarder Reuse same port", () => {
  jest.setTimeout(180_000);

  let randomPort: number;
  let server: Server;

  beforeAll(async () => {
    randomPort = await new RandomUniquePortGenerator().generatePort();
  });

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      server = createServer((req, res) => {
        res.writeHead(200);
        res.end("hello world");
      });
      server.listen(randomPort, resolve);
    });
  });

  afterEach(() => {
    server.close();
    jest.resetModules();
  });

  it("should not conflict when port forwarder is already running 1", async () => {
    const { TestContainers } = await import("../test-containers");
    await TestContainers.exposeHostPorts(randomPort);

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));

    await container.stop();
  });

  it("should not conflict when port forwarder is already running 2", async () => {
    const { TestContainers } = await import("../test-containers");
    await TestContainers.exposeHostPorts(randomPort);

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));

    await container.stop();
  });
});
