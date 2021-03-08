import getRandomPort from "get-port";
import { Port } from "./port";

export interface PortClient {
  getPort(): Promise<Port>;
}

export class RandomPortClient implements PortClient {
  private preferredRandomPort(min: number, max: number) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public getPort(): Promise<Port> {
    return getRandomPort({ port: this.preferredRandomPort(10000, 65535) });
  }
}

export class FixedPortClient implements PortClient {
  private portIndex = 0;

  constructor(private readonly ports: Port[]) {}

  public getPort(): Promise<Port> {
    return Promise.resolve(this.ports[this.portIndex++]);
  }
}
