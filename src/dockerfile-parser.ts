import { EOL } from "os";
import { promises as fs } from "fs";
import { log } from "./logger";
import { DockerImageName } from "./docker-image-name";
import { BuildArgs } from "./docker/types";

const buildArgRegex = /\${([^{]+)}/g;

export const getDockerfileImages = async (dockerfile: string, buildArgs: BuildArgs): Promise<DockerImageName[]> => {
  try {
    return Array.from(await parseImages(dockerfile))
      .map((line: string) => line.replace(buildArgRegex, (_, arg) => buildArgs[arg] ?? ""))
      .map((line) => DockerImageName.fromString(line));
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
};

async function parseImages(dockerfile: string) {
  return (await fs.readFile(dockerfile, "utf8"))
    .split(EOL)
    .filter((line) => line.toUpperCase().startsWith("FROM"))
    .map((line: string) => line.split(" ").filter((part) => part !== "")[1])
    .reduce((prev, next) => prev.add(next), new Set<string>())
    .values();
}
