import { Port } from "./port";
import { PortForwarderInstance } from "./port-forwarder";

export class TestContainers {
  public static async exposeHostPorts(...ports: Port[]): Promise<void> {
    const portForwarder = await PortForwarderInstance.getInstance();
    await Promise.all(ports.map((port) => portForwarder.exposeHostPort(port)));
  }
}
