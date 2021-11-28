import { loadTestcontainersPropertiesFile } from "../load-testcontainers-properties-file";

loadTestcontainersPropertiesFile();

export { upMany, upAll, down, stop, version } from "docker-compose";
export type { IDockerComposeOptions } from "docker-compose";
