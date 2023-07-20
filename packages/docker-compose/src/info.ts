import dockerComposeV1, { v2 as dockerComposeV2 } from "docker-compose";

export type DockerComposeCompatibility = "v1" | "v2";

export type DockerComposeInfo = {
  version: string;
  compatability: DockerComposeCompatibility;
};

export async function getDockerComposeInfo(): Promise<DockerComposeInfo | undefined> {
  try {
    return {
      version: (await dockerComposeV1.version()).data.version,
      compatability: "v1",
    };
  } catch (err) {
    try {
      return {
        version: (await dockerComposeV2.version()).data.version,
        compatability: "v2",
      };
    } catch {
      return undefined;
    }
  }
}
