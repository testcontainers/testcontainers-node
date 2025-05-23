import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import * as TPClient from "toxiproxy-node-client";

const CONTROL_PORT = 8474;
const FIRST_PROXIED_PORT = 8666;

const PORT_ARRAY = Array.from({ length: 32 }, (_, i) => i + FIRST_PROXIED_PORT);

export interface CreatedProxy {
  host: string;
  port: number;
  instance: TPClient.Proxy;
  setEnabled: (enabled: boolean) => Promise<TPClient.Proxy>;
}

// Export this so that types can be used externally
export { TPClient };

export class ToxiProxyContainer extends GenericContainer {
  constructor(image = "ghcr.io/shopify/toxiproxy:2.11.0") {
    super(image);

    this.withExposedPorts(CONTROL_PORT, ...PORT_ARRAY)
      .withWaitStrategy(Wait.forHttp("/version", CONTROL_PORT))
      .withStartupTimeout(30_000);
  }

  public override async start(): Promise<StartedToxiProxyContainer> {
    return new StartedToxiProxyContainer(await super.start());
  }
}

export class StartedToxiProxyContainer extends AbstractStartedContainer {
  /**
   *
   */
  public readonly client: TPClient.Toxiproxy;

  /**
   *
   * @param startedTestContainer
   */
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);

    this.client = new TPClient.Toxiproxy(`http://${this.getHost()}:${this.getMappedPort(CONTROL_PORT)}`);
  }

  public async createProxy(createProxyBody: Omit<TPClient.ICreateProxyBody, "listen">): Promise<CreatedProxy> {
    // Firstly get the list of proxies to find the next available port
    const proxies = await this.client.getAll();

    const usedPorts = PORT_ARRAY.reduce(
      (acc, port) => {
        acc[port] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );

    for (const proxy of Object.values(proxies)) {
      const lastColon = proxy.listen.lastIndexOf(":");
      const port = parseInt(proxy.listen.substring(lastColon + 1), 10);
      usedPorts[port] = true;
    }

    // Find the first available port
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const port = Object.entries(usedPorts).find(([_, used]) => !used);
    if (!port) {
      throw new Error("No available ports left");
    }

    const listen = `0.0.0.0:${port[0]}`;

    const proxy = await this.client.createProxy({
      ...createProxyBody,
      listen,
    });

    const setEnabled = (enabled: boolean) =>
      proxy.update({
        enabled,
        listen,
        upstream: createProxyBody.upstream,
      });

    return {
      host: this.getHost(),
      port: this.getMappedPort(parseInt(port[0], 10)),
      instance: proxy,
      setEnabled,
    };
  }
}
