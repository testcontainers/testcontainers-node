import { HealthCheckStatus, Labels, NetworkSettings, Ports } from "../../types";
import Dockerode, { ContainerInspectInfo } from "dockerode";
import { log } from "../../../logger";

export type InspectResult = {
  name: string;
  hostname: string;
  ports: Ports;
  healthCheckStatus: HealthCheckStatus;
  networkSettings: { [networkName: string]: NetworkSettings };
  state: { status: string; running: boolean; startedAt: Date; finishedAt: Date | undefined };
  labels: Labels;
};

export const inspectContainer = async (container: Dockerode.Container): Promise<InspectResult> => {
  try {
    const inspectResult = await container.inspect();
    const finishedAt = new Date(inspectResult.State.FinishedAt);

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
  } catch (err) {
    log.error(`Failed to inspect container: ${err}`, { containerId: container.id });
    throw err;
  }
};

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
