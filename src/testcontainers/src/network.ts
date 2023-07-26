import { log, RandomUuid, Uuid } from "@testcontainers/common";
import { ContainerRuntimeClient, getContainerRuntimeClient } from "@testcontainers/container-runtime";
import { createLabels } from "./labels";
import Dockerode from "dockerode";
import { getReaper } from "./reaper";

export class Network {
  constructor(private readonly uuid: Uuid = new RandomUuid()) {}

  public async start(): Promise<StartedNetwork> {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    const name = this.uuid.nextUuid();
    log.info(`Starting network "${name}"...`);

    const network = await client.network.create({
      Name: name,
      CheckDuplicate: true,
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Ingress: false,
      EnableIPv6: false,
      Labels: createLabels(reaper.sessionId),
    });
    log.info(`Started network "${name}" with ID "${network.id}"`);

    return new StartedNetwork(client, name, network);
  }
}

export class StartedNetwork {
  constructor(
    private readonly client: ContainerRuntimeClient,
    private readonly name: string,
    private readonly network: Dockerode.Network
  ) {}

  public getId(): string {
    return this.network.id;
  }

  public getName(): string {
    return this.name;
  }

  public async stop(): Promise<StoppedNetwork> {
    log.info(`Stopping network with ID "${this.network.id}"...`);
    await this.client.network.remove(this.network);
    log.info(`Stopped network with ID "${this.network.id}"`);
    return new StoppedNetwork();
  }
}

export class StoppedNetwork {}
