import { ContainerName, HealthCheckStatus, NetworkSettings, Ports } from "../../types";
import Dockerode, { ContainerInspectInfo } from "dockerode";
import { log } from "../../../logger";

export type InspectResult = {
  name: ContainerName;
  ports: Ports;
  healthCheckStatus: HealthCheckStatus;
  networkSettings: { [networkName: string]: NetworkSettings };
  state: { status: string; running: boolean };
};

export const inspectContainer = async (container: Dockerode.Container): Promise<InspectResult> => {
  try {
    const inspectResult = await container.inspect();

    return {
      ports: getPorts(inspectResult),
      name: getName(inspectResult),
      healthCheckStatus: getHealthCheckStatus(inspectResult),
      networkSettings: getNetworkSettings(inspectResult),
      state: { status: inspectResult.State.Status, running: inspectResult.State.Running },
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

const getName = (inspectInfo: ContainerInspectInfo): ContainerName => inspectInfo.Name;

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
