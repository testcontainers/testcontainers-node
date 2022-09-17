import { Socket } from "net";
import { Port } from "./port";
import { Host } from "./docker/types";
import { execContainer } from "./docker/functions/container/exec-container";
import { log } from "./logger";
import Dockerode from "dockerode";

export interface PortCheck {
  isBound(port: Port): Promise<boolean>;
}

export class HostPortCheck implements PortCheck {
  constructor(private readonly host: Host) {}

  public isBound(port: Port): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new Socket();
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
        .connect(port, this.host, () => {
          socket.end();
          resolve(true);
        });
    });
  }
}

export class InternalPortCheck implements PortCheck {
  private isDistroless = false;
  private commandOutputs = new Set<string>();

  constructor(private readonly container: Dockerode.Container) {}

  public async isBound(port: Port): Promise<boolean> {
    const portHex = port.toString(16).padStart(4, "0");
    const commands = [
      ["/bin/sh", "-c", `cat /proc/net/tcp* | awk '{print $2}' | grep -i :${portHex}`],
      ["/bin/sh", "-c", `nc -vz -w 1 localhost ${port}`],
      ["/bin/bash", "-c", `</dev/tcp/localhost/${port}`],
    ];

    const commandResults = await Promise.all(commands.map((command) => execContainer(this.container, command)));
    const isBound = commandResults.some((result) => result.exitCode === 0);

    if (!isBound) {
      const shellExists = commandResults.some((result) => result.exitCode !== 126);
      if (!shellExists) {
        if (!this.isDistroless) {
          this.isDistroless = true;
          log.error(
            `The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy for container ${this.container.id}`
          );
        }
      } else {
        commandResults
          .map((result) => ({ ...result, output: result.output.trim() }))
          .filter((result) => result.exitCode !== 126 && result.output.length > 0)
          .forEach((result) => {
            if (!this.commandOutputs.has(this.commandOutputsKey(result.output))) {
              log.trace(
                `Port check result for container ${this.container.id} exit code ${result.exitCode}: ${result.output}`
              );
              this.commandOutputs.add(this.commandOutputsKey(result.output));
            }
          });
      }
    }

    return isBound;
  }

  private commandOutputsKey(output: string) {
    return `${this.container.id}:${output}`;
  }
}
