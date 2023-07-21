import Dockerode, { Network, NetworkCreateOptions } from "dockerode";
import { log } from "@testcontainers/logger";
import { NetworkClient } from "./network-client";

export class DockerNetworkClient implements NetworkClient {
  constructor(protected readonly dockerode: Dockerode) {}

  async create(opts: NetworkCreateOptions): Promise<Network> {
    try {
      log.debug(`Creating network "${opts.Name}"...`);
      const network: Network = await this.dockerode.createNetwork(opts);
      log.debug(`Created network "${opts.Name}"`);
      return network;
    } catch (err) {
      log.error(`Failed to create network "${opts.Name}": ${err}`);
      throw err;
    }
  }

  async remove(network: Dockerode.Network): Promise<void> {
    try {
      log.debug(`Removing network "${network.id}"...`);
      const { message } = await network.remove();
      if (message) {
        log.warn(`Message received when removing network "${network.id}": ${message}`);
      }
      log.debug(`Removed network "${network.id}"...`);
    } catch (err) {
      log.error(`Failed to remove network "${network.id}": ${err}`);
      throw err;
    }
  }
}
