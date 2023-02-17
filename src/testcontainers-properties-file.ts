import path from "path";
import { log } from "./logger";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import propertiesReader from "properties-reader";

const file = path.resolve(homedir(), ".testcontainers.properties");

let dockerHost: string | undefined;
let dockerTlsVerify: string | undefined;
let dockerCertPath: string | undefined;

if (existsSync(file)) {
  log.debug("Found .testcontainers.properties file");
  const string = readFileSync(file, { encoding: "utf-8" });
  const properties = propertiesReader("").read(string);

  const host = properties.get("docker.host") as string;
  if (host !== null) {
    log.debug(`Setting docker-host to ${host}`);
    dockerHost = host;
  }

  const tlsVerify = properties.get("docker.tls.verify") as number;
  if (tlsVerify !== null) {
    log.debug(`Setting docker-tls-verify to ${tlsVerify}`);
    dockerTlsVerify = `${tlsVerify}`;
  }

  const certPath = properties.get("docker.cert.path") as string;
  if (certPath !== null) {
    log.debug(`Setting docker-cert-path to ${certPath}`);
    dockerCertPath = certPath;
  }
}

export { dockerHost, dockerTlsVerify, dockerCertPath };
