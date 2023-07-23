import getRandomPort from "get-port";

export interface PortGenerator {
  generatePort(): Promise<number>;
}

class RandomPortGenerator {
  public generatePort(): Promise<number> {
    return getRandomPort({ port: this.randomBetweenInclusive(10000, 65535) });
  }

  private randomBetweenInclusive(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
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
