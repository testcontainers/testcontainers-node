import {createServer, Server} from "http";
import {GenericContainer} from "./generic-container";
import {TestContainers} from "./test-containers";
import {RandomPortClient} from "./port-client";
import {Network} from "./network";

describe("PortForwarder", () => {
  jest.setTimeout(180_000);

  let randomPort: number;
  let server: Server;

  beforeEach(async () => {
    randomPort = await new RandomPortClient().getPort();
    server = await new Promise((resolve) => {
      const server = createServer((req, res) => {
        res.writeHead(200);
        res.end("hello world");
      });
      server.listen(randomPort, () => resolve(server));
    });
  });

  afterEach(() => {
    server.close();
  });

  it("should expose host ports to the container", async () => {
    await TestContainers.exposeHostPorts(randomPort);

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12").withCmd(["top"]).start();

    const { output } = await container.exec(["curl", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toBe("hello world");

    await container.stop();
  });

  it("should expose host ports to the container with custom network", async () => {
    await TestContainers.exposeHostPorts(randomPort);

    const network = await new Network().start();
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withNetworkMode(network.getName())
      .withCmd(["top"])
      .start();

    const { output } = await container.exec(["curl", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toBe("hello world");

    await container.stop();
    await network.stop();
  });

  it("should expose host ports to the container with custom network and network alias", async () => {
    await TestContainers.exposeHostPorts(randomPort);

    const network = await new Network().start();
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.12")
      .withNetworkMode(network.getName())
      .withNetworkAliases("foo")
      .withCmd(["top"])
      .start();

    const { output } = await container.exec(["curl", `http://host.testcontainers.internal:${randomPort}`]);
    expect(output).toBe("hello world");

    await container.stop();
    await network.stop();
  });
});
