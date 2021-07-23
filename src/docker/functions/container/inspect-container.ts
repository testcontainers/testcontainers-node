import { ContainerName, HealthCheckStatus, NetworkSettings } from "../../types";
import { Port } from "../../../port";
import Dockerode, { ContainerInspectInfo } from "dockerode";

export type InspectResult = {
  name: ContainerName;
  internalPorts: Port[];
  hostPorts: Port[];
  healthCheckStatus: HealthCheckStatus;
  networkSettings: { [networkName: string]: NetworkSettings };
};

export const inspectContainer = async (container: Dockerode.Container): Promise<InspectResult> => {
  try {
    const inspectResult = await container.inspect();

    return {
      hostPorts: getHostPorts(inspectResult),
      internalPorts: getInternalPorts(inspectResult),
      name: getName(inspectResult),
      healthCheckStatus: getHealthCheckStatus(inspectResult),
      networkSettings: getNetworkSettings(inspectResult),
    };
  } catch (err) {
    throw err;
  }
};

const getHostPorts = (inspectInfo: ContainerInspectInfo): Port[] =>
  Object.values(inspectInfo.NetworkSettings.Ports)
    .filter((portsArray) => portsArray !== null)
    .map((portsArray) => Number(portsArray[0].HostPort));

const getInternalPorts = (inspectInfo: ContainerInspectInfo): Port[] =>
  Object.keys(inspectInfo.NetworkSettings.Ports).map((port) => Number(port.split("/")[0]));

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
