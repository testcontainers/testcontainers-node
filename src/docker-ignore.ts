import { existsSync, promises as fs } from "fs";
import os from "os";
import glob from "glob";
import path from "path";

export const findDockerIgnoreFiles = async (context: string): Promise<Set<string>> => {
  const dockerIgnoreFilePath = path.join(context, ".dockerignore");

  if (!existsSync(dockerIgnoreFilePath)) {
    return new Set<string>();
  }

  const dockerIgnorePatterns = (await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" }))
    .toString()
    .split(os.EOL)
    .map((dockerIgnorePattern) => path.resolve(context, dockerIgnorePattern));

  const dockerIgnoreMatches: string[][] = await Promise.all(dockerIgnorePatterns.map(findIgnoredFilesForPattern));

  return new Set<string>(dockerIgnoreMatches.flat());
};

const findIgnoredFilesForPattern = (dockerIgnorePattern: string): Promise<string[]> =>
  new Promise((resolve, reject) =>
    glob(dockerIgnorePattern, (err, matches) => {
      if (err) {
        return reject(err);
      } else {
        resolve(matches);
      }
    })
  );
