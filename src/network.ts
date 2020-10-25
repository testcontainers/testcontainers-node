import { CreateNetworkOptions, DockerClient } from "./docker-client";
import { DockerClientFactory } from "./docker-client-factory";
import { RandomUuid, Uuid } from "./uuid";
import { log } from "./logger";
import { ReaperFactory } from "./reaper";

export class Network {
  private readonly createNetworkOptions: CreateNetworkOptions;

  constructor(
    createNetworkOptions: Partial<CreateNetworkOptions> = {},
    private readonly uuid: Uuid = new RandomUuid()
  ) {
    this.createNetworkOptions = {
      name: this.uuid.nextUuid(),
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
    const dockerClient = await DockerClientFactory.getClient();
    await ReaperFactory.start(dockerClient);

    const id = await dockerClient.createNetwork(this.createNetworkOptions);
    log.info(`Started network with ID: ${id}`);

    return new StartedNetwork(id, this.createNetworkOptions, dockerClient);
  }
}

export class StartedNetwork {
  constructor(
    private readonly id: string,
    private readonly options: CreateNetworkOptions,
    private readonly dockerClient: DockerClient
  ) {}

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.options.name;
  }

  public async stop(): Promise<StoppedNetwork> {
    log.info(`Stopping network with ID: ${this.id}`);
    await this.dockerClient.removeNetwork(this.id);
    return new StoppedNetwork();
  }
}

export class StoppedNetwork {}
