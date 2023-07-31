import { ContainerInspectInfo } from "dockerode";
import { InspectResult } from "@testcontainers/testcontainers";
import { HealthCheckStatus, NetworkSettings, Ports } from "../types";

export function mapInspectResult(inspectResult: ContainerInspectInfo): InspectResult {
  const finishedAt = new Date(inspectResult.State.FinishedAt);

  const getPorts = (inspectInfo: ContainerInspectInfo): Ports =>
    Object.entries(inspectInfo.NetworkSettings.Ports)
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

  const getHealthCheckStatus = (inspectResult: ContainerInspectInfo): HealthCheckStatus => {
    const health = inspectResult.State.Health;

    if (health === undefined) {
      return "none";
    } else {
      return health.Status as HealthCheckStatus;
    }
  };

  const getNetworkSettings = (inspectResult: ContainerInspectInfo): { [networkName: string]: NetworkSettings } =>
    Object.entries(inspectResult.NetworkSettings.Networks)
      .map(([networkName, network]) => ({
        [networkName]: {
          networkId: network.NetworkID,
          ipAddress: network.IPAddress,
        },
      }))
      .reduce((prev, next) => ({ ...prev, ...next }), {});

  return {
    name: inspectResult.Name,
    hostname: inspectResult.Config.Hostname,
    ports: getPorts(inspectResult),
    healthCheckStatus: getHealthCheckStatus(inspectResult),
    networkSettings: getNetworkSettings(inspectResult),
    state: {
      status: inspectResult.State.Status,
      running: inspectResult.State.Running,
      startedAt: new Date(inspectResult.State.StartedAt),
      finishedAt: finishedAt.getTime() < 0 ? undefined : finishedAt,
    },
    labels: inspectResult.Config.Labels,
  };
}
