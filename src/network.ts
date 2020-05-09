import { CreateNetworkOptions } from "./docker-client";
import { DockerodeClientFactory } from "./docker-client-factory";
import { RandomUuid } from "./uuid";

class StartedNetwork {
  constructor(
    private readonly id: string,
    private readonly options: CreateNetworkOptions,
    private readonly dockerClientFactory: DockerodeClientFactory
  ) {}

  public getId(): string {
    return this.id!;
  }

  public getName(): string {
    return this.options.name;
  }

  public async close(): Promise<void> {
    return this.dockerClientFactory.getClient().removeNetwork(this.id);
  }
}

export class Network {
  public static async newNetwork(
    partialOptions: Partial<CreateNetworkOptions> = {},
    dockerClientFactory: DockerodeClientFactory = new DockerodeClientFactory()
  ): Promise<StartedNetwork> {
    const options: CreateNetworkOptions = {
      name: new RandomUuid().nextUuid(),
      driver: "bridge",
      checkDuplicate: true,
      internal: true,
      attachable: false,
      ingress: false,
      enableIPv6: false,
      ...partialOptions
    };
    const id = await dockerClientFactory.getClient().createNetwork(options);
    return new StartedNetwork(id, options, dockerClientFactory);
  }
}
