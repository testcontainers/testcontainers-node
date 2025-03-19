import { ContainerInspectInfo } from "dockerode";
import { HealthCheckStatus, InspectResult, NetworkSettings, Ports } from "../types";

export function mapInspectResult(inspectResult: ContainerInspectInfo): InspectResult {
  const finishedAt = new Date(inspectResult.State.FinishedAt);

  return {
    name: inspectResult.Name,
    hostname: inspectResult.Config.Hostname,
    ports: mapPorts(inspectResult),
    healthCheckStatus: mapHealthCheckStatus(inspectResult),
    networkSettings: mapNetworkSettings(inspectResult),
    state: {
      status: inspectResult.State.Status,
      running: inspectResult.State.Running,
      startedAt: new Date(inspectResult.State.StartedAt),
      finishedAt: finishedAt.getTime() < 0 ? undefined : finishedAt,
    },
    labels: inspectResult.Config.Labels,
  };
}

function mapPorts(inspectInfo: ContainerInspectInfo): Ports {
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

function mapHealthCheckStatus(inspectResult: ContainerInspectInfo): HealthCheckStatus {
  const health = inspectResult.State.Health;

  if (health === undefined) {
    return "none";
  } else {
    return health.Status as HealthCheckStatus;
  }
}

function mapNetworkSettings(inspectResult: ContainerInspectInfo): { [networkName: string]: NetworkSettings } {
  return Object.entries(inspectResult.NetworkSettings.Networks)
    .map(([networkName, network]) => ({
      [networkName]: {
        networkId: network.NetworkID,
        ipAddress: network.IPAddress,
      },
    }))
    .reduce((prev, next) => ({ ...prev, ...next }), {});
}
