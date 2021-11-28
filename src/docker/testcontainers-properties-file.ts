import path from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import propertiesReader from "properties-reader";

export type TestcontainersPropertiesFile = {
  host: string;
  ca?: string;
  cert?: string;
  key?: string;
};

export const readTestcontainersPropertiesFile = (): TestcontainersPropertiesFile | undefined => {
  const file = path.resolve(homedir(), ".testcontainers.properties");

  if (existsSync(file)) {
    const string = readFileSync(file, { encoding: "utf-8" });
    const properties = propertiesReader("").read(string);
    const host = properties.get("docker.host") as string;

    if (host) {
      const tlsVerify = properties.get("docker.tls.verify") as number;

      if (tlsVerify === 1) {
        const certPath = properties.get("docker.cert.path") as string;

        const ca = path.resolve(certPath, "ca.pem");
        const cert = path.resolve(certPath, "cert.pem");
        const key = path.resolve(certPath, "key.pem");

        return { host, ca, cert, key };
      }

      return { host };
    }
  }
};
