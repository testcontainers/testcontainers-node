import dockerComposeV1, { v2 as dockerComposeV2 } from "docker-compose";
import { ComposeInfo } from "../types";

export async function getComposeInfo(): Promise<ComposeInfo | undefined> {
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
