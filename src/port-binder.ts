import { BoundPorts } from "./bound-ports.js";
import { PortGenerator, RandomUniquePortGenerator } from "./port-generator.js";

export class PortBinder {
  constructor(private readonly portGenerator: PortGenerator = new RandomUniquePortGenerator()) {}

  public async bind(ports: number[]): Promise<BoundPorts> {
    const boundPorts = new BoundPorts();

    for (const port of ports) {
      boundPorts.setBinding(port, await this.portGenerator.generatePort());
    }

    return boundPorts;
  }
}
