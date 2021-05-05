import { EOL } from "os";
import { promises as fs } from "fs";
import { log } from "./logger";
import { DockerImageName } from "./docker-image-name";

export const getDockerfileImages = async (dockerfile: string): Promise<DockerImageName[]> => {
  try {
    return Array.from(
      (await fs.readFile(dockerfile, "utf8"))
        .split(EOL)
        .filter((line) => line.toUpperCase().startsWith("FROM"))
        .map((line) => {
          const parts = line.split(" ");
          return parts[parts.length - 1];
        })
        .map((image) => DockerImageName.fromString(image))
        .reduce((prev, next) => prev.add(next), new Set<DockerImageName>())
        .values()
    );
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
};
