import { BoundPorts } from "./bound-ports";
import { Port } from "./port";
import { PortClient, RandomPortClient } from "./port-client";

export class PortBinder {
  private readonly ports: Set<number> = new Set();

  constructor(private readonly portClient: PortClient = new RandomPortClient()) {}

  public async bind(ports: Port[]): Promise<BoundPorts> {
    const boundPorts = new BoundPorts();

    for (const port of ports) {
      let allocatedPort: Port;
      do {
        allocatedPort = await this.portClient.getPort();
      } while (this.ports.has(allocatedPort));

      this.ports.add(allocatedPort);
      boundPorts.setBinding(port, allocatedPort);
    }

    return boundPorts;
  }
}
