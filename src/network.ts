import { CreateNetworkOptions } from "./docker-client";
import { DockerodeClientFactory } from "./docker-client-factory";
import { RandomUuid, Uuid } from "./uuid";

export class Network {
  private readonly createNetworkOptions: CreateNetworkOptions;

  constructor(
    createNetworkOptions: Partial<CreateNetworkOptions> = {},
    private readonly uuid: Uuid = new RandomUuid(),
    private readonly dockerClientFactory: DockerodeClientFactory = new DockerodeClientFactory()
  ) {
    this.createNetworkOptions = {
      name: this.uuid.nextUuid(),
      driver: "bridge",
      checkDuplicate: true,
      internal: false,
      attachable: false,
      ingress: false,
      enableIPv6: false,
      ...createNetworkOptions
    };
  }

  public async start(): Promise<StartedNetwork> {
    const id = await this.dockerClientFactory.getClient().createNetwork(this.createNetworkOptions);
    return new StartedNetwork(id, this.createNetworkOptions, this.dockerClientFactory);
  }
}

export class StartedNetwork {
  constructor(
    private readonly id: string,
    private readonly options: CreateNetworkOptions,
    private readonly dockerClientFactory: DockerodeClientFactory
  ) {}

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.options.name;
  }

  public async stop(): Promise<void> {
    return this.dockerClientFactory.getClient().removeNetwork(this.id);
  }
}
