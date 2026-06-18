import net from "net";

export interface PortGenerator {
  generatePort(): Promise<number>;
}

const lockedPorts = new Set<number>();
const releaseLockedPortAfterMs = 15_000;

export class RandomPortGenerator {
  public async generatePort(): Promise<number> {
    let port = await getAvailablePort();
    while (isLockedPort(port)) {
      port = await getAvailablePort();
    }

    lockPort(port);
    return port;
  }
}

const getAvailablePort = async (): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to allocate a random TCP port"));
        return;
      }

      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
};

const isLockedPort = (port: number): boolean => lockedPorts.has(port);

const lockPort = (port: number): void => {
  lockedPorts.add(port);
  const releaseLockedPortTimeout = setTimeout(() => lockedPorts.delete(port), releaseLockedPortAfterMs);
  releaseLockedPortTimeout.unref();
};

const randomPortGenerator = new RandomPortGenerator();

export const getRandomPort = (): Promise<number> => randomPortGenerator.generatePort();

export class FixedPortGenerator implements PortGenerator {
  private portIndex = 0;

  constructor(private readonly ports: number[]) {}

  public generatePort(): Promise<number> {
    return Promise.resolve(this.ports[this.portIndex++]);
  }
}
