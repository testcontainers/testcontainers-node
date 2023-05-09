import path from "path";
import { log } from "../../logger";
import { homedir } from "os";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import propertiesReader from "properties-reader";

export type DockerClientConfig = {
  testcontainersCloudHost?: string;
  dockerHost?: string;
  dockerTlsVerify?: string;
  dockerCertPath?: string;
};

export const getDockerClientConfig = async (env: NodeJS.ProcessEnv = process.env): Promise<DockerClientConfig> => {
  const dockerClientConfig: DockerClientConfig = {
    ...(await loadFromFile()),
    ...loadFromEnv(env),
  };
  logDockerClientConfig(dockerClientConfig);
  return dockerClientConfig;
};

async function loadFromFile() {
  const file = path.resolve(homedir(), ".testcontainers.properties");

  const dockerClientConfig: DockerClientConfig = {};

  if (existsSync(file)) {
    log.debug(`Found ".testcontainers.properties" file`);
    const string = await readFile(file, { encoding: "utf-8" });
    const properties = propertiesReader("").read(string);

    const testcontainersCloudHost = properties.get("tcc.host") as string;
    if (testcontainersCloudHost !== null) {
      dockerClientConfig.testcontainersCloudHost = testcontainersCloudHost;
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
  }

  return dockerClientConfig;
}

function loadFromEnv(env: NodeJS.ProcessEnv) {
  const dockerClientConfig: DockerClientConfig = {};

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

function logDockerClientConfig(config: DockerClientConfig) {
  if (!log.enabled()) {
    return;
  }

  const configurations = Object.entries(config)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: "${value}"`);

  if (configurations.length > 0) {
    log.debug(`Loaded Docker client configuration, ${configurations.join(", ")}`);
  }
}
