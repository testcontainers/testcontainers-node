import { Socket } from "net";
import { Container } from "./container";
import { DockerClient } from "./docker-client";
import { Host } from "./docker-client-factory";
import { Port } from "./port";

export interface PortCheck {
  isBound(port: Port): Promise<boolean>;
}

export class HostPortCheck implements PortCheck {
  constructor(private readonly host: Host) {}

  public async isBound(port: Port): Promise<boolean> {
    return new Promise(resolve => {
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
  constructor(private readonly container: Container, private readonly dockerClient: DockerClient) {}

  public async isBound(port: Port): Promise<boolean> {
    const portHex = port.toString(16).padStart(4, "0");
    const commands = [
      ["/bin/sh", "-c", `cat /proc/net/tcp{,6} | awk '{print $2}' | grep -i :${portHex}`],
      ["/bin/sh", "-c", `nc -vz -w 1 localhost ${port}`],
      ["/bin/bash", "-c", `</dev/tcp/localhost/${port}`]
    ];
    const commandResults = await Promise.all(commands.map(command => this.dockerClient.exec(this.container, command)));
    return commandResults.some(result => result.exitCode === 0);
  }
}
