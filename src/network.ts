import { RandomUuid, Uuid } from "./uuid";
import { log } from "@testcontainers/logger";
import { createNetwork, CreateNetworkOptions } from "./docker/functions/network/create-network";
import { removeNetwork } from "./docker/functions/network/remove-network";
import { getDockerClient } from "./docker/client/docker-client";

export class Network {
  constructor(
    private readonly createNetworkOptions: Partial<CreateNetworkOptions> = {},
    private readonly uuid: Uuid = new RandomUuid()
  ) {
    this.createNetworkOptions = createNetworkOptions;
  }

  public async start(): Promise<StartedNetwork> {
    const name = this.uuid.nextUuid();
    const options = {
      name,
      driver: "bridge",
      checkDuplicate: true,
      internal: false,
      attachable: false,
      ingress: false,
      enableIPv6: false,
      ...this.createNetworkOptions,
    };

    log.info(`Starting network "${name}"...`);
    const { sessionId } = await getDockerClient();
    const id = await createNetwork(sessionId, options);
    log.info(`Started network "${name}" with ID "${id}"`);

    return new StartedNetwork(id, options);
  }
}

export class StartedNetwork {
  constructor(private readonly id: string, private readonly options: CreateNetworkOptions) {}

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.options.name;
  }

  public async stop(): Promise<StoppedNetwork> {
    log.info(`Stopping network with ID "${this.id}"...`);
    await removeNetwork(this.id);
    log.info(`Stopped network with ID "${this.id}"`);
    return new StoppedNetwork();
  }
}

export class StoppedNetwork {}
