import { Port } from "./port";
import { PortForwarderInstance } from "./port-forwarder";
import { DockerClientInstance } from "./docker-client-instance";

export class TestContainers {
  public static async exposeHostPorts(...ports: Port[]): Promise<void> {
    const portForwarder = await PortForwarderInstance.getInstance(await DockerClientInstance.getInstance());
    await Promise.all(ports.map((port) => portForwarder.exposeHostPort(port)));
  }
}
