import { Network, NetworkCreateOptions } from "dockerode";

export interface NetworkClient {
  create(opts: NetworkCreateOptions): Promise<Network>;

  remove(network: Network): Promise<void>;
}
