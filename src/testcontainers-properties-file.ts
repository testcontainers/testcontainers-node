import path from "path";
import { log } from "./logger";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import propertiesReader from "properties-reader";

const file = path.resolve(homedir(), ".testcontainers.properties");

let dockerHost: string | undefined;
let dockerTlsVerify: string | undefined;
let dockerCertPath: string | undefined;

if (process.env["DOCKER_HOST"] !== undefined) {
  dockerHost = process.env["DOCKER_HOST"];
}
if (process.env["DOCKER_TLS_VERIFY"] !== undefined) {
  dockerTlsVerify = process.env["DOCKER_TLS_VERIFY"];
}
if (process.env["DOCKER_CERT_PATH"] !== undefined) {
  dockerCertPath = process.env["DOCKER_CERT_PATH"];
}

if (existsSync(file)) {
  log.debug("Found .testcontainers.properties file");
  const string = readFileSync(file, { encoding: "utf-8" });
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

export { dockerHost, dockerTlsVerify, dockerCertPath };
