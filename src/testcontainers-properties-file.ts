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

  let logStr = "Loaded .testcontainers.properties file";

  const host = properties.get("docker.host") as string;
  if (host !== null) {
    dockerHost = host;
    logStr += `, dockerHost: ${dockerHost}`;
  }

  const tlsVerify = properties.get("docker.tls.verify") as number;
  if (tlsVerify !== null) {
    dockerTlsVerify = `${tlsVerify}`;
    logStr += `, dockerTlsVerify: ${dockerTlsVerify}`;
  }

  const certPath = properties.get("docker.cert.path") as string;
  if (certPath !== null) {
    dockerCertPath = certPath;
    logStr += `, dockerCertPath: ${dockerCertPath}`;
  }

  log.debug(logStr);
}

export { dockerHost, dockerTlsVerify, dockerCertPath };
