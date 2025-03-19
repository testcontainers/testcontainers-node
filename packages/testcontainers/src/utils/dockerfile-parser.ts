import { promises as fs } from "fs";
import { isNotEmptyString, log } from "../common";
import { ImageName } from "../container-runtime";
import { BuildArgs } from "../types";

const buildArgRegex = /\${([^{]+)}/g;

export async function getDockerfileImages(dockerfile: string, buildArgs: BuildArgs): Promise<ImageName[]> {
  try {
    return (await parseImages(dockerfile))
      .map((line) => line.replace(buildArgRegex, (_, arg) => buildArgs[arg] ?? ""))
      .map((line) => ImageName.fromString(line.trim()));
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
}

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
