import { log } from "../../../logger.js";
import { Network } from "dockerode";
import { dockerClient } from "../../docker-client.js";
import { createLabels } from "../create-labels.js";

export type CreateNetworkOptions = {
  name: string;
  driver: "bridge" | "overlay" | string; // third option is for user-installed custom network drivers
  checkDuplicate: boolean;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  enableIPv6: boolean;
  labels?: { [key: string]: string };
  options?: { [key: string]: string };
};

export const createNetwork = async (options: CreateNetworkOptions): Promise<string> => {
  try {
    log.info(`Creating network ${options.name}`);
    const { dockerode } = await dockerClient();

    const network: Network = await dockerode.createNetwork({
      Name: options.name,
      CheckDuplicate: options.checkDuplicate,
      Driver: options.driver,
      Internal: options.internal,
      Attachable: options.attachable,
      Ingress: options.ingress,
      EnableIPv6: options.enableIPv6,
      Options: options.options,
      Labels: { ...options.labels, ...createLabels(false) },
    });

    return network.id;
  } catch (err) {
    log.error(`Failed to create network: ${err}`);
    throw err;
  }
};
