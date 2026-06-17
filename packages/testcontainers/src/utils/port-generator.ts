import net from "net";

export interface PortGenerator {
  generatePort(): Promise<number>;
}

export class RandomPortGenerator {
  public async generatePort(): Promise<number> {
    const server = net.createServer();
    server.unref();

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, () => resolve());
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Failed to allocate a random TCP port");
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    return address.port;
  }
}

const randomPortGenerator = new RandomPortGenerator();

export const getRandomPort = (): Promise<number> => randomPortGenerator.generatePort();

export class FixedPortGenerator implements PortGenerator {
  private portIndex = 0;

  constructor(private readonly ports: number[]) {}

  public generatePort(): Promise<number> {
    return Promise.resolve(this.ports[this.portIndex++]);
  }
}
