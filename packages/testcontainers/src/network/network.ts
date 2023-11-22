import Dockerode from "dockerode";
import { log, RandomUuid } from "../common";
import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { createLabels, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";

/**
 * Networks are user-defined networks that containers can be attached to.
 *
 * Use:
 *  - {@link Network.constructor} and {@link Network.start} to create and start a new network instance.
 *  - {@link Network.getNetwork} to get an already started network instance.
 *
 *    @example Using the {@link Network} constructor
 *    ```ts
 *    const network = new Network();
 *    const startedNetwork = await network.start();
 *    ```
 *
 *    @example Using the {@link Network.getNetwork} static method
 *    ```ts
 *    const startedNetwork = await Network.getNetwork("my-network");
 *    ```
 *
 * See Docker's {@link https://docs.docker.com/network|networking documentation} for more information.
 */
export class Network {
  /**
   * Get an already started network by _Network ID_ (or by _name_).
   *
   * The network must be started before it can be fetched. If the network does not exist, an error is thrown.
   *
   * @param id - _Network ID_ (or _name_) of the network to get.
   * @returns A new network instance.
   */
  public static async getNetwork(id: string): Promise<StartedExistingNetwork> {
    const client = await getContainerRuntimeClient();
    const network = client.network.getById(id);

    // Fetch the network details to get the name actual name of the network.
    // As an existing network can be fetched by _Network ID_ or by _name_, we
    // need to get the name of the network. This might be redundant if the
    // network was fetched by name, but it is needed if the network was fetched
    // by ID.
    const networkDetails: Dockerode.NetworkInspectInfo = await network.inspect();

    return new StartedExistingNetwork(client, networkDetails.Id, networkDetails.Name, network);
  }

  /**
   * Create a new network instance.
   *
   * The new network will be named using a random UUID to avoid name collisions and the following settings:
   *
   *  - **Driver**: `bridge`
   *  - **Internal**: `false` (external access to the network is allowed).
   *
   * The network is not created until {@link start} is called. Once the network is started, it can be stopped
   * by calling {@link stop}.
   *
   * The created network will be automatically removed from the container runtime by testcontainers' reaper.
   */
  constructor(private readonly name: string = new RandomUuid().nextUuid()) {}

  /**
   * Start the network.
   *
   * This method creates the network in the container runtime.
   */
  public async start(): Promise<StartedBridgeNetwork> {
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);

    log.info(`Starting network "${this.name}"...`);

    const labels = createLabels();
    labels[LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;

    const network = await client.network.create({
      Name: this.name,
      CheckDuplicate: true,
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Ingress: false,
      EnableIPv6: false,
      Labels: labels,
    });
    log.info(`Started network "${this.name}" with ID "${network.id}"`);

    return new StartedBridgeNetwork(client, network.id, this.name, network);
  }
}

/**
 * A started network.
 */
export interface StartedNetwork {
  getId(): string;

  getName(): string;
}

/**
 * A started network that can be stopped.
 */
export interface StoppableNetwork {
  stop(): Promise<void>;
}

/**
 * A started bridge network.
 *
 * This class is not intended to be instantiated directly. Instead, use:
 *  - {@link Network.constructor} and {@link Network.start} to create and start a new network instance.
 *  - {@link Network.getNetwork} to get an already started network instance.
 *
 *    @example Using the {@link Network} constructor
 *    ```ts
 *    const network = new Network();
 *    const startedNetwork = await network.start();
 *    ```
 *
 *    @example Using the {@link Network.getNetwork} static method
 *    ```ts
 *    const startedNetwork = await Network.getNetwork("my-network");
 *    ```
 *
 * A started network can be stopped (i.e., removed from the container runtime) by calling {@link stop}.
 */
export class StartedBridgeNetwork implements StartedNetwork, StoppableNetwork {
  constructor(
    private readonly client: ContainerRuntimeClient,
    private readonly id: string,
    private readonly name: string,
    private readonly network: Dockerode.Network
  ) {}

  /**
   * Get the ID of the network.
   *
   * @returns The ID of the network.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get the name of the network.
   *
   * @returns The name of the network.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Stop the network.
   *
   * This method removes the network from the container runtime.
   *
   * @returns A promise that resolves when the network has been stopped.
   */
  public async stop(): Promise<void> {
    log.info(`Stopping network with ID "${this.id}"...`);
    await this.client.network.remove(this.network);
    log.info(`Stopped network with ID "${this.id}"`);
  }
}

/**
 * A started network that already existed in the container runtime.
 *
 * This class is not intended to be instantiated directly. Instead, use {@link Network.getNetwork} to get an already
 * started network instance by _Network ID_ (or by _name_).
 *
 *    @example Using the {@link Network.getNetwork} static method
 *    ```ts
 *    const startedNetwork = await Network.getNetwork("my-network");
 *    ```
 *
 * To avoid interfering with existing networks, a `StartedExistingNetwork` instance cannot be stopped.
 */
export class StartedExistingNetwork implements StartedNetwork {
  constructor(
    private readonly client: ContainerRuntimeClient,
    private readonly id: string,
    private readonly name: string,
    private readonly network: Dockerode.Network
  ) {}

  /**
   * Get the ID of the network.
   *
   * @returns The ID of the network.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get the name of the network.
   *
   * @returns The name of the network.
   */
  public getName(): string {
    return this.name;
  }
}
