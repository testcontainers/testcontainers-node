import { existsSync, promises as fs } from "fs";
import glob from "glob";
import path from "path";

export const findDockerIgnoreFiles = async (context: string): Promise<Set<string>> => {
  const dockerIgnoreFiles = new Set<string>();
  const dockerIgnoreFilePath = path.join(context, ".dockerignore");

  if (!existsSync(dockerIgnoreFilePath)) {
    return dockerIgnoreFiles;
  }

  const dockerIgnorePatterns = (await fs.readFile(dockerIgnoreFilePath, { encoding: "utf-8" }))
    .toString()
    .split("\n")
    .map(dockerIgnorePattern => path.resolve(context, dockerIgnorePattern));

  const dockerIgnoreMatches: string[][] = await Promise.all(
    dockerIgnorePatterns.map(
      dockerIgnorePattern =>
        new Promise((resolve, reject) =>
          glob(dockerIgnorePattern, (err, matches) => {
            if (err) {
              return reject(err);
            } else {
              resolve(matches);
            }
          })
        )
    )
  );

  dockerIgnoreMatches.forEach(dockerIgnoreFileBatch => {
    dockerIgnoreFileBatch.forEach(dockerIgnoreFile => dockerIgnoreFiles.add(dockerIgnoreFile));
  });

  return dockerIgnoreFiles;
};
