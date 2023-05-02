import { RandomUuid, Uuid } from "./uuid";
import { log } from "./logger";
import { ReaperInstance } from "./reaper";
import { createNetwork, CreateNetworkOptions } from "./docker/functions/network/create-network";
import { removeNetwork } from "./docker/functions/network/remove-network";

export class Network {
  constructor(
    private readonly createNetworkOptions: Partial<CreateNetworkOptions> = {},
    private readonly uuid: Uuid = new RandomUuid()
  ) {
    this.createNetworkOptions = createNetworkOptions;
  }

  public async start(): Promise<StartedNetwork> {
    const options = {
      name: this.uuid.nextUuid(),
      driver: "bridge",
      checkDuplicate: true,
      internal: false,
      attachable: false,
      ingress: false,
      enableIPv6: false,
      ...this.createNetworkOptions,
    };

    await ReaperInstance.getInstance();

    const id = await createNetwork(options);
    log.info(`Started network with ID: ${id}`);

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
    log.info(`Stopping network with ID: ${this.id}`);
    await removeNetwork(this.id);
    return new StoppedNetwork();
  }
}

export class StoppedNetwork {}
