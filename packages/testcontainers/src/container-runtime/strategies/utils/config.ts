import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import propertiesReader from "properties-reader";
import { log } from "../../../common";

export type ContainerRuntimeConfig = {
  tcHost?: string;
  dockerHost?: string;
  dockerTlsVerify?: string;
  dockerCertPath?: string;
};

let containerRuntimeConfig: ContainerRuntimeConfig;

export type GetContainerRuntimeConfig = (env?: NodeJS.ProcessEnv) => Promise<ContainerRuntimeConfig>;

export const getContainerRuntimeConfig: GetContainerRuntimeConfig = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<ContainerRuntimeConfig> => {
  if (!containerRuntimeConfig) {
    containerRuntimeConfig = {
      ...(await loadFromFile()),
      ...loadFromEnv(env),
    };
    logDockerClientConfig(containerRuntimeConfig);
  }
  return containerRuntimeConfig;
};

async function loadFromFile() {
  const file = path.resolve(homedir(), ".testcontainers.properties");

  const dockerClientConfig: ContainerRuntimeConfig = {};

  if (existsSync(file)) {
    log.debug(`Loading ".testcontainers.properties" file...`);
    const string = await readFile(file, { encoding: "utf-8" });
    const properties = propertiesReader("").read(string);

    const tcHost = properties.get("tc.host") as string;
    if (tcHost !== null) {
      dockerClientConfig.tcHost = tcHost;
    }

    const dockerHost = properties.get("docker.host") as string;
    if (dockerHost !== null) {
      dockerClientConfig.dockerHost = dockerHost;
    }

    const dockerTlsVerify = properties.get("docker.tls.verify") as number;
    if (dockerTlsVerify !== null) {
      dockerClientConfig.dockerTlsVerify = `${dockerTlsVerify}`;
    }

    const dockerCertPath = properties.get("docker.cert.path") as string;
    if (dockerCertPath !== null) {
      dockerClientConfig.dockerCertPath = dockerCertPath;
    }

    log.debug(`Loaded ".testcontainers.properties" file`);
  }

  return dockerClientConfig;
}

function loadFromEnv(env: NodeJS.ProcessEnv) {
  const dockerClientConfig: ContainerRuntimeConfig = {};

  if (env["DOCKER_HOST"] !== undefined) {
    dockerClientConfig.dockerHost = env["DOCKER_HOST"];
  }
  if (env["DOCKER_TLS_VERIFY"] !== undefined) {
    dockerClientConfig.dockerTlsVerify = env["DOCKER_TLS_VERIFY"];
  }
  if (env["DOCKER_CERT_PATH"] !== undefined) {
    dockerClientConfig.dockerCertPath = env["DOCKER_CERT_PATH"];
  }

  return dockerClientConfig;
}

function logDockerClientConfig(config: ContainerRuntimeConfig) {
  if (!log.enabled()) {
    return;
  }

  const configurations = Object.entries(config)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: "${value}"`);

  if (configurations.length > 0) {
    log.debug(`Found custom configuration: ${configurations.join(", ")}`);
  }
}
