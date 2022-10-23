import { RandomUuid, Uuid } from "./uuid.js";
import { log } from "./logger.js";
import { ReaperInstance } from "./reaper.js";
import { createNetwork, CreateNetworkOptions } from "./docker/functions/network/create-network.js";
import { removeNetwork } from "./docker/functions/network/remove-network.js";

export class Network {
  private readonly createNetworkOptions: CreateNetworkOptions;

  constructor(createNetworkOptions: Partial<CreateNetworkOptions> = {}, uuid: Uuid = new RandomUuid()) {
    this.createNetworkOptions = {
      name: uuid.nextUuid(),
      driver: "bridge",
      checkDuplicate: true,
      internal: false,
      attachable: false,
      ingress: false,
      enableIPv6: false,
      ...createNetworkOptions,
    };
  }

  public async start(): Promise<StartedNetwork> {
    await ReaperInstance.getInstance();

    const id = await createNetwork(this.createNetworkOptions);
    log.info(`Started network with ID: ${id}`);

    return new StartedNetwork(id, this.createNetworkOptions);
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
    log.info(`Stopping network with ID: ${this.id}`);
    await removeNetwork(this.id);
    return new StoppedNetwork();
  }
}

export class StoppedNetwork {}
