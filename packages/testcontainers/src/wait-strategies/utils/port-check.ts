import Dockerode from "dockerode";
import { Socket } from "net";
import { log } from "../../common";
import { ContainerRuntimeClient } from "../../container-runtime";

export interface PortCheck {
  isBound(port: number | string): Promise<boolean>;
}

export class HostPortCheck implements PortCheck {
  constructor(private readonly client: ContainerRuntimeClient) {}

  public isBound(port: number | string): Promise<boolean> {
    if (typeof port === "string" && port.toLowerCase().endsWith("/udp")) {
      log.debug(`Skipping host port check for UDP port ${port} (UDP port checks not supported)`);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const socket = new Socket();
      const portNumber = typeof port === "string" ? parseInt(port.split("/")[0], 10) : port;
      socket
        .setTimeout(1000)
        .on("error", () => {
          socket.destroy();
          resolve(false);
        })
        .on("timeout", () => {
          socket.destroy();
          resolve(false);
        })
        .connect(portNumber, this.client.info.containerRuntime.host, () => {
          socket.end();
          resolve(true);
        });
    });
  }
}

export class InternalPortCheck implements PortCheck {
  private isDistroless = false;
  private readonly commandOutputs = new Set<string>();

  constructor(
    private readonly client: ContainerRuntimeClient,
    private readonly container: Dockerode.Container
  ) {}

  public async isBound(port: number | string): Promise<boolean> {
    if (typeof port === "string" && port.toLowerCase().includes("/udp")) {
      log.debug(`Skipping internal port check for UDP port ${port} (UDP port checks not supported)`, {
        containerId: this.container.id,
      });
      return Promise.resolve(true);
    }

    const portNumber = typeof port === "string" ? parseInt(port.split("/")[0], 10) : port;
    const portHex = portNumber.toString(16).padStart(4, "0");
    const commands = [
      ["/bin/sh", "-c", `cat /proc/net/tcp* | awk '{print $2}' | grep -i :${portHex}`],
      ["/bin/sh", "-c", `nc -vz -w 1 localhost ${portNumber}`],
      ["/bin/bash", "-c", `</dev/tcp/localhost/${portNumber}`],
    ];

    const commandResults = await Promise.all(
      commands.map((command) => this.client.container.exec(this.container, command, { log: false }))
    );
    const isBound = commandResults.some((result) => result.exitCode === 0);

    // https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html
    // If a command is not found, the child process created to execute it returns a status of 127.
    // If a command is found but is not executable, the return status is 126.
    const shellExists = commandResults.some((result) => result.exitCode !== 126 && result.exitCode !== 127);
    if (!isBound && !shellExists && !this.isDistroless) {
      this.isDistroless = true;
      log.error(`The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy`, {
        containerId: this.container.id,
      });
    }

    if (!isBound && log.enabled()) {
      commandResults
        .map((result) => ({ ...result, output: result.output.trim() }))
        .filter((result) => result.exitCode !== 126 && result.output.length > 0)
        .forEach((result) => {
          if (!this.commandOutputs.has(this.commandOutputsKey(result.output))) {
            log.trace(`Port check result exit code ${result.exitCode}: ${result.output}`, {
              containerId: this.container.id,
            });
            this.commandOutputs.add(this.commandOutputsKey(result.output));
          }
        });
    }

    return isBound;
  }

  private commandOutputsKey(output: string) {
    return `${this.container.id}:${output}`;
  }
}
