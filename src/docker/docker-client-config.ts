import path from "path";
import { log } from "../logger";
import { homedir } from "os";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import propertiesReader from "properties-reader";

export type DockerClientConfig = {
  dockerHost?: string;
  dockerTlsVerify?: string;
  dockerCertPath?: string;
};

export const getDockerClientConfig = async (env: NodeJS.ProcessEnv = process.env): Promise<DockerClientConfig> => {
  let dockerHost: string | undefined;
  let dockerTlsVerify: string | undefined;
  let dockerCertPath: string | undefined;

  if (env["DOCKER_HOST"] !== undefined) {
    dockerHost = env["DOCKER_HOST"];
  }
  if (env["DOCKER_TLS_VERIFY"] !== undefined) {
    dockerTlsVerify = env["DOCKER_TLS_VERIFY"];
  }
  if (env["DOCKER_CERT_PATH"] !== undefined) {
    dockerCertPath = env["DOCKER_CERT_PATH"];
  }

  const file = path.resolve(homedir(), ".testcontainers.properties");
  if (existsSync(file)) {
    log.debug("Found .testcontainers.properties file");
    const string = await readFile(file, { encoding: "utf-8" });
    const properties = propertiesReader("").read(string);

    const host = properties.get("docker.host") as string;
    if (host !== null) {
      dockerHost = host;
    }

    const tlsVerify = properties.get("docker.tls.verify") as number;
    if (tlsVerify !== null) {
      dockerTlsVerify = `${tlsVerify}`;
    }

    const certPath = properties.get("docker.cert.path") as string;
    if (certPath !== null) {
      dockerCertPath = certPath;
    }
  }

  let logStr = "Loaded properties: ";
  if (dockerHost !== undefined) {
    logStr += `dockerHost=${dockerHost}, `;
  }
  if (dockerTlsVerify !== undefined) {
    logStr += `dockerTlsVerify=${dockerTlsVerify}, `;
  }
  if (dockerCertPath !== undefined) {
    logStr += `dockerCertPath=${dockerCertPath}`;
  }
  log.debug(logStr);

  return { dockerHost, dockerTlsVerify, dockerCertPath };
};
