import { promises as fs } from "fs";
import { log } from "@testcontainers/logger";
import { DockerImageName } from "./docker-image-name";
import { BuildArgs } from "./docker/types";
import { isNotEmptyString } from "./type-guards";

const buildArgRegex = /\${([^{]+)}/g;

export const getDockerfileImages = async (dockerfile: string, buildArgs: BuildArgs): Promise<DockerImageName[]> => {
  try {
    return (await parseImages(dockerfile))
      .map((line) => line.replace(buildArgRegex, (_, arg) => buildArgs[arg] ?? ""))
      .map((line) => DockerImageName.fromString(line.trim()));
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
};

async function parseImages(dockerfile: string): Promise<string[]> {
  return Array.from(
    (await fs.readFile(dockerfile, "utf8"))
      .split(/\r?\n/)
      .filter((line) => line.toUpperCase().startsWith("FROM"))
      .map((line) => line.split(" ").filter(isNotEmptyString)[1])
      .reduce((prev, next) => prev.add(next), new Set<string>())
      .values()
  );
}
