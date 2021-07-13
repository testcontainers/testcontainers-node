import { BoundPorts } from "./bound-ports";
import { Port } from "./port";
import { PortGenerator, RandomUniquePortGenerator } from "./port-generator";

export class PortBinder {
  constructor(private readonly portGenerator: PortGenerator = new RandomUniquePortGenerator()) {}

  public async bind(ports: Port[]): Promise<BoundPorts> {
    const boundPorts = new BoundPorts();

    for (const port of ports) {
      boundPorts.setBinding(port, await this.portGenerator.generatePort());
    }

    return boundPorts;
  }
}
