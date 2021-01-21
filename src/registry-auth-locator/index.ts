import path from "path";
import os from "os";
import { DockerConfig } from "./types";
import { promises as fs } from "fs";

const dockerConfigFile = path.resolve(os.homedir(), ".docker", "config.json");

const dockerConfigPromise: Promise<DockerConfig> = fs.readFile(dockerConfigFile).then((buffer) => {
  const object = JSON.parse(buffer.toString());

  return {
    credsStore: object.credsStore,
    credHelpers: object.credHelpers,
    auths: object.auths,
  };
});
