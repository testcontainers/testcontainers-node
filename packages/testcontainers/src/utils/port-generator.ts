import getPort, { portNumbers } from "get-port";

export interface PortGenerator {
  generatePort(): Promise<number>;
}

class RandomPortGenerator {
  public generatePort(): Promise<number> {
    return getPort({ port: portNumbers(10000, 65535) });
  }
}

export class RandomUniquePortGenerator implements PortGenerator {
  private static readonly assignedPorts = new Set();

  constructor(private readonly portGenerator: PortGenerator = new RandomPortGenerator()) {}

  public async generatePort(): Promise<number> {
    let port: number;

    do {
      port = await this.portGenerator.generatePort();
    } while (RandomUniquePortGenerator.assignedPorts.has(port));

    RandomUniquePortGenerator.assignedPorts.add(port);

    return port;
  }
}

export class FixedPortGenerator implements PortGenerator {
  private portIndex = 0;

  constructor(private readonly ports: number[]) {}

  public generatePort(): Promise<number> {
    return Promise.resolve(this.ports[this.portIndex++]);
  }
}
