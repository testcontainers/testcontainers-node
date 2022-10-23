import { EOL } from "os";
import { promises as fs } from "fs";
import { log } from "./logger.js";
import { DockerImageName } from "./docker-image-name.js";

export const getDockerfileImages = async (dockerfile: string): Promise<DockerImageName[]> => {
  try {
    return Array.from(
      (await fs.readFile(dockerfile, "utf8"))
        .split(EOL)
        .filter((line) => line.toUpperCase().startsWith("FROM"))
        .map((line) => {
          const parts = line.split(" ").filter((part) => part !== "");
          return parts[1];
        })
        .reduce((prev, next) => prev.add(next), new Set<string>())
        .values()
    ).map((image) => DockerImageName.fromString(image));
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
};
