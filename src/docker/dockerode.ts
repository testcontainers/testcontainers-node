import Dockerode from "dockerode";
import { loadTestcontainersPropertiesFile } from "../testcontainers-properties-file";

loadTestcontainersPropertiesFile();

export const dockerode = new Dockerode();
