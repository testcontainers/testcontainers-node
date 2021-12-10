import path from "path";
import { log } from "./logger";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import propertiesReader from "properties-reader";

const file = path.resolve(homedir(), ".testcontainers.properties");

if (existsSync(file)) {
  log.debug("Found .testcontainers.properties file");
  const string = readFileSync(file, { encoding: "utf-8" });
  const properties = propertiesReader("").read(string);

  const host = properties.get("docker.host") as string;
  if (host !== null) {
    log.debug(`Setting DOCKER_HOST to ${host}`);
    process.env.DOCKER_HOST = host;
  }

  const tlsVerify = properties.get("docker.tls.verify") as number;
  if (tlsVerify !== null) {
    log.debug(`Setting DOCKER_TLS_VERIFY to ${tlsVerify}`);
    process.env.DOCKER_TLS_VERIFY = `${tlsVerify}`;
  }

  const certPath = properties.get("docker.cert.path") as string;
  if (certPath !== null) {
    log.debug(`Setting DOCKER_CERT_PATH to ${certPath}`);
    process.env.DOCKER_CERT_PATH = certPath;
  }
}
