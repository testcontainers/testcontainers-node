import { getContainerPort, PortWithOptionalBinding } from "./port";
import { HostIp } from "@testcontainers/container-runtime";
import { HostPortBindings, Ports } from "./types";
import net from "net";
import { ContainerInspectInfo } from "dockerode";

export class BoundPorts {
  private readonly ports = new Map<number, number>();

  public getBinding(port: number): number {
    const binding = this.ports.get(port);

    if (!binding) {
      throw new Error(`No port binding found for :${port}`);
    }

    return binding;
  }

  public getFirstBinding(): number {
    const firstBinding = this.ports.values().next().value;

    if (!firstBinding) {
      throw new Error("No port bindings found");
    } else {
      return firstBinding;
    }
  }

  public setBinding(key: number, value: number): void {
    this.ports.set(key, value);
  }

  public iterator(): Iterable<[number, number]> {
    return this.ports;
  }

  public filter(ports: PortWithOptionalBinding[]): BoundPorts {
    const boundPorts = new BoundPorts();

    const containerPorts = ports.map((port) => getContainerPort(port));

    for (const [internalPort, hostPort] of this.iterator()) {
      if (containerPorts.includes(internalPort)) {
        boundPorts.setBinding(internalPort, hostPort);
      }
    }

    return boundPorts;
  }

  public static fromInspectResult(hostIps: HostIp[], inspectResult: ContainerInspectInfo): BoundPorts {
    const boundPorts = new BoundPorts();

    const ports = getPorts(inspectResult);
    Object.entries(ports).forEach(([containerPort, hostBindings]) => {
      const hostPort = resolveHostPortBinding(hostIps, hostBindings);
      boundPorts.setBinding(parseInt(containerPort), hostPort);
    });

    return boundPorts;
  }
}

function getPorts(inspectInfo: ContainerInspectInfo): Ports {
  return Object.entries(inspectInfo.NetworkSettings.Ports)
    .filter(([, hostPorts]) => hostPorts !== null)
    .map(([containerPortAndProtocol, hostPorts]) => {
      const containerPort = parseInt(containerPortAndProtocol.split("/")[0]);
      return {
        [containerPort]: hostPorts.map((hostPort) => ({
          hostIp: hostPort.HostIp,
          hostPort: parseInt(hostPort.HostPort),
        })),
      };
    })
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

export function resolveHostPortBinding(hostIps: HostIp[], hostPortBindings: HostPortBindings): number {
  if (isDualStackIp(hostPortBindings)) {
    return hostPortBindings[0].hostPort;
  }

  for (const { family } of hostIps) {
    const hostPortBinding = hostPortBindings.find(({ hostIp }) => net.isIP(hostIp) === family);
    if (hostPortBinding !== undefined) {
      return hostPortBinding.hostPort;
    }
  }
  throw new Error("No host port found for host IP");
}

function isDualStackIp(hostPortBindings: HostPortBindings): boolean {
  return hostPortBindings.length === 1 && hostPortBindings[0].hostIp === "";
}
