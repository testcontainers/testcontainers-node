import { log } from "./common";
import { getContainerRuntimeClient } from "./container-runtime";
import { PortForwarderInstance } from "./port-forwarder/port-forwarder";

export class TestContainers {
  public static async exposeHostPorts(...ports: number[]): Promise<void> {
    const portForwarder = await PortForwarderInstance.getInstance();

    await Promise.all(
      ports.map((port) =>
        portForwarder.exposeHostPort(port).catch(async (err) => {
          if (await this.isHostPortExposed(portForwarder.getContainerId(), port)) {
            log.debug(`Host port ${port} is already exposed`);
          } else {
            throw err;
          }
        })
      )
    );
  }

  private static async isHostPortExposed(portForwarderContainerId: string, hostPort: number): Promise<boolean> {
    const client = await getContainerRuntimeClient();
    const container = client.container.getById(portForwarderContainerId);

    const { exitCode } = await client.container.exec(container, [
      "sh",
      "-c",
      `netstat -tl | grep ${hostPort} | grep LISTEN`,
    ]);

    return exitCode === 0;
  }
}
