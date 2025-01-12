import { AbstractStartedContainer, GenericContainer, type StartedTestContainer } from "testcontainers";

const SCYLLA_PORT = 9042;

export class ScyllaContainer extends GenericContainer {
  constructor(image = "scylladb/scylla:6.2.0") {
    super(image);
    this.withExposedPorts(SCYLLA_PORT);
    this.withCommand(["--skip-wait-for-gossip-to-settle=0"]);
  }

  public override async start(): Promise<StartedScyllaContainer> {
    this.withEnvironment({
      SCYLLA_LISTEN_ADDRESS: "0.0.0.0",
      SCYLLA_BROADCAST_ADDRESS: "0.0.0.0",
      SCYLLA_RPC_ADDRESS: "0.0.0.0",
    });
    const startedContainer = await super.start();
    return new StartedScyllaContainer(startedContainer);
  }
}

export class StartedScyllaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(SCYLLA_PORT);
  }

  public getDatacenter(): string {
    return "datacenter1"; // Forced in docker.
  }

  public getContactPoint(): string {
    return `${this.getHost()}:${this.getPort()}`;
  }
}
