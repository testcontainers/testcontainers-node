import { BoundPorts } from "./bound-ports";
import { Port } from "./port";
import { PortClient, RandomPortClient } from "./port-client";

export class PortBinder {
  constructor(private readonly portClient: PortClient = new RandomPortClient()) {}

  public async bind(ports: Port[]): Promise<BoundPorts> {
    const boundPorts = new BoundPorts();

    for (const port of ports) {
      boundPorts.setBinding(port, await this.portClient.getPort());
    }

    return boundPorts;
  }
}
