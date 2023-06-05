import { log } from "../../../logger";
import { DockerImageName } from "../../../docker-image-name";
import { getDockerClient } from "../../client/docker-client";
import Dockerode, { PortMap as DockerodePortBindings } from "dockerode";
import { getContainerPort, hasHostBinding, PortWithOptionalBinding } from "../../../port";
import { createLabels } from "../create-labels";
import { BindMount, Environment, ExtraHost, HealthCheck, Labels, ResourcesQuota, TmpFs, Ulimits } from "../../types";

// Docker docs: https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerCreate
export type CreateContainerOptions = {
  imageName: DockerImageName;
  environment: Environment;
  command: string[];
  entrypoint?: string[];
  bindMounts: BindMount[];
  tmpFs: TmpFs;
  exposedPorts: PortWithOptionalBinding[];
  name?: string;
  reusable: boolean;
  labels?: Labels;
  networkMode?: string;
  healthCheck?: HealthCheck;
  useDefaultLogDriver: boolean;
  privilegedMode: boolean;
  autoRemove: boolean;
  extraHosts: ExtraHost[];
  ipcMode?: string;
  ulimits?: Ulimits;
  addedCapabilities?: string[];
  droppedCapabilities?: string[];
  user?: string;
  workingDir?: string;
  resourcesQuota?: ResourcesQuota;
  sharedMemorySize?: number;
};

export const createContainer = async (options: CreateContainerOptions): Promise<Dockerode.Container> => {
  try {
    log.info(`Creating container for image "${options.imageName}"...`);
    const { dockerode } = await getDockerClient();

    const container = await dockerode.createContainer({
      name: options.name,
      User: options.user,
      Image: options.imageName.toString(),
      Env: getEnvironment(options.environment),
      ExposedPorts: getExposedPorts(options.exposedPorts),
      Cmd: options.command,
      Entrypoint: options.entrypoint,
      Labels: createLabels(options.reusable, options.imageName, options.labels),
      Healthcheck: getHealthCheck(options.healthCheck),
      WorkingDir: options.workingDir,
      HostConfig: {
        IpcMode: options.ipcMode,
        ExtraHosts: getExtraHosts(options.extraHosts),
        AutoRemove: options.autoRemove,
        NetworkMode: options.networkMode,
        PortBindings: getPortBindings(options.exposedPorts),
        Binds: getBindMounts(options.bindMounts),
        Tmpfs: options.tmpFs,
        LogConfig: getLogConfig(options.useDefaultLogDriver),
        Privileged: options.privilegedMode,
        Ulimits: getUlimits(options.ulimits),
        CapAdd: options.addedCapabilities,
        CapDrop: options.droppedCapabilities,
        Memory: options.resourcesQuota?.memory,
        NanoCpus: options.resourcesQuota?.cpu,
        ShmSize: options.sharedMemorySize,
      },
    });
    log.info(`Created container for image "${options.imageName}"`, { containerId: container.id });
    return container;
  } catch (err) {
    log.error(`Failed to create container for image "${options.imageName}": ${err}`);
    throw err;
  }
};

type DockerodeEnvironment = string[];

const getEnvironment = (environment: Environment): DockerodeEnvironment =>
  Object.entries(environment).reduce(
    (dockerodeEnvironment, [key, value]) => [...dockerodeEnvironment, `${key}=${value}`],
    [] as DockerodeEnvironment
  );

type DockerodeExposedPorts = { [port in string]: Record<string, unknown> };

const getExposedPorts = (exposedPorts: PortWithOptionalBinding[]): DockerodeExposedPorts => {
  const dockerodeExposedPorts: DockerodeExposedPorts = {};
  for (const exposedPort of exposedPorts) {
    dockerodeExposedPorts[getContainerPort(exposedPort).toString()] = {};
  }
  return dockerodeExposedPorts;
};

const getExtraHosts = (extraHosts: ExtraHost[]): string[] => {
  return extraHosts.map((extraHost) => `${extraHost.host}:${extraHost.ipAddress}`);
};

const getPortBindings = (exposedPorts: PortWithOptionalBinding[]): DockerodePortBindings => {
  const dockerodePortBindings: DockerodePortBindings = {};
  for (const exposedPort of exposedPorts) {
    if (hasHostBinding(exposedPort)) {
      dockerodePortBindings[exposedPort.container] = [{ HostPort: exposedPort.host.toString() }];
    } else {
      dockerodePortBindings[exposedPort] = [{ HostPort: "0" }];
    }
  }
  return dockerodePortBindings;
};

const getBindMounts = (bindMounts: BindMount[]): string[] => {
  return bindMounts.map(({ source, target, mode }) => `${source}:${target}:${mode}`);
};

type DockerodeHealthCheck = {
  Test: string[];
  Interval: number;
  Timeout: number;
  Retries: number;
  StartPeriod: number;
};

const getHealthCheck = (healthCheck?: HealthCheck): DockerodeHealthCheck | undefined => {
  if (healthCheck === undefined) {
    return undefined;
  }

  return {
    Test: healthCheck.test,
    Interval: healthCheck.interval ? toNanos(healthCheck.interval) : 0,
    Timeout: healthCheck.timeout ? toNanos(healthCheck.timeout) : 0,
    Retries: healthCheck.retries || 0,
    StartPeriod: healthCheck.startPeriod ? toNanos(healthCheck.startPeriod) : 0,
  };
};

const toNanos = (duration: number): number => duration * 1e6;

type DockerodeLogConfig = {
  Type: string;
  Config: Record<string, unknown>;
};

const getLogConfig = (useDefaultLogDriver: boolean): DockerodeLogConfig | undefined => {
  if (!useDefaultLogDriver) {
    return undefined;
  }

  return {
    Type: "json-file",
    Config: {},
  };
};

type DockerodeUlimit = {
  Name?: string;
  Hard?: number;
  Soft?: number;
};

const getUlimits = (ulimits: Ulimits | undefined): DockerodeUlimit[] | undefined => {
  if (!ulimits) {
    return undefined;
  }

  return Object.entries(ulimits).map(([key, value]) => ({
    Name: key,
    Hard: value.hard,
    Soft: value.soft,
  }));
};
