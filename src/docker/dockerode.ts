import Dockerode from "dockerode";
import { log } from "../logger";
import { readTestcontainersPropertiesFile } from "./testcontainers-properties-file";

const createDockerode = (): Dockerode => {
  const testcontainersPropertiesFile = readTestcontainersPropertiesFile();

  if (!testcontainersPropertiesFile) {
    return new Dockerode();
  } else {
    return new Dockerode({
      host: testcontainersPropertiesFile.host,
      ca: testcontainersPropertiesFile.ca,
      cert: testcontainersPropertiesFile.cert,
      key: testcontainersPropertiesFile.key,
    });
  }
};

log.debug("Creating new Docker instance");
export const dockerode = createDockerode();
