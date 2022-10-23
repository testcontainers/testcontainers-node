import { PortForwarderInstance } from "./port-forwarder.js";

export class TestContainers {
  public static async exposeHostPorts(...ports: number[]): Promise<void> {
    const portForwarder = await PortForwarderInstance.getInstance();
    await Promise.all(ports.map((port) => portForwarder.exposeHostPort(port)));
  }
}
