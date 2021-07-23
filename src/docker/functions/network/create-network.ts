import { log } from "../../../logger";
import { Network } from "dockerode";
import { dockerode } from "../../dockerode";
import { createLabels } from "../create-labels";

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

    const network: Network = await dockerode.createNetwork({
      Name: options.name,
      CheckDuplicate: options.checkDuplicate,
      Driver: options.driver,
      Internal: options.internal,
      Attachable: options.attachable,
      Ingress: options.ingress,
      EnableIPv6: options.enableIPv6,
      Options: options.options,
      Labels: { ...options.labels, ...createLabels() },
    });

    return network.id;
  } catch (err) {
    log.error(`Failed to create network: ${err}`);
    throw err;
  }
};
