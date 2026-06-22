export interface PortGenerator {
  generatePort(): Promise<number>;
}

export class RandomPortGenerator {
  public async generatePort(): Promise<number> {
    const { default: getPort } = await import("get-port");
    return getPort();
  }
}

export class FixedPortGenerator implements PortGenerator {
  private portIndex = 0;

  constructor(private readonly ports: number[]) {}

  public generatePort(): Promise<number> {
    if (this.portIndex >= this.ports.length) {
      throw new Error("FixedPortGenerator has no more ports available");
    }
    return Promise.resolve(this.ports[this.portIndex++]);
  }
}
