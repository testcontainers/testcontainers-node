import { Socket } from "net";
import { Port } from "./port";
import { Host } from "./docker/types";
import { execContainer } from "./docker/functions/container/exec-container";
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
  constructor(private readonly container: Dockerode.Container) {}

  public async isBound(port: Port): Promise<boolean> {
    const portHex = port.toString(16).padStart(4, "0");
    const commands = [
      ["/bin/sh", "-c", `cat /proc/net/tcp* | awk '{print $2}' | grep -i :${portHex}`],
      ["/bin/sh", "-c", `nc -vz -w 1 localhost ${port}`],
      ["/bin/bash", "-c", `</dev/tcp/localhost/${port}`],
    ];
    const commandResults = await Promise.all(
      commands.map((command) => execContainer(this.container, command, { Tty: true }))
    );
    return commandResults.some((result) => result.exitCode === 0);
  }
}
