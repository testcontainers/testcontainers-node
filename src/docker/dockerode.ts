import Dockerode from "dockerode";
import { log } from "../logger";
import { loadTestcontainersPropertiesFile } from "../load-testcontainers-properties-file";

log.debug("Creating new Docker instance");
loadTestcontainersPropertiesFile();
export const dockerode = new Dockerode();
