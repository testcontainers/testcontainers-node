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
    log.error(`Failed to inspect container ${container.id}: ${err}`);
    throw err;
  }
};

const getPorts = (inspectInfo: ContainerInspectInfo): Ports =>
  Object.entries(inspectInfo.NetworkSettings.Ports)
    .filter(([, hostPorts]) => hostPorts !== null)
    .map(([internalPort, hostPorts]) => {
      const hostPort = hostPorts[0].HostPort;
      return { [parseInt(internalPort.split("/")[0])]: parseInt(hostPort) };
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

export const containerRestartedLogOptions = (
  inspectResult: InspectResult
): Omit<Dockerode.ContainerLogsOptions, "follow" | "stdout" | "stderr"> | undefined => {
  const { finishedAt } = inspectResult.state;
  if (finishedAt === undefined) {
    return undefined;
  }

  return {
    since: finishedAt.getTime() / 1000,
    timestamps: true,
  };
};

export const hasContainerRestarted = (inspectResult: InspectResult) => {
  const { finishedAt, status } = inspectResult.state;
  return finishedAt !== undefined && status === "running";
};
