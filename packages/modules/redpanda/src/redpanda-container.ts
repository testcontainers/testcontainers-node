import fs from "fs";
import { compile } from "handlebars";
import path from "path";
import {
  AbstractStartedContainer,
  BoundPorts,
  GenericContainer,
  getContainerRuntimeClient,
  InspectResult,
  StartedTestContainer,
  Wait,
  waitForContainer,
  WaitStrategy,
} from "testcontainers";

const REDPANDA_PORT = 9092;
const REDPANDA_ADMIN_PORT = 9644;
const SCHEMA_REGISTRY_PORT = 8081;
const REST_PROXY_PORT = 8082;
const STARTER_SCRIPT = "/testcontainers_start.sh";
const WAIT_FOR_SCRIPT_MESSAGE = "Waiting for script...";

export class RedpandaContainer extends GenericContainer {
  private originalWaitinStrategy: WaitStrategy;

  constructor(image = "docker.redpanda.com/redpandadata/redpanda:v23.3.10") {
    super(image);
    this.withExposedPorts(REDPANDA_PORT, REDPANDA_ADMIN_PORT, SCHEMA_REGISTRY_PORT, REST_PROXY_PORT)
      .withUser("root:root")
      .withWaitStrategy(Wait.forLogMessage("Successfully started Redpanda!"))
      .withCopyFilesToContainer([
        {
          source: path.join(__dirname, "assets", "bootstrap.yaml"),
          target: "/etc/redpanda/.bootstrap.yaml",
        },
      ]);
    this.originalWaitinStrategy = this.waitStrategy;
  }

  public override async start(): Promise<StartedRedpandaContainer> {
    return new StartedRedpandaContainer(await super.start());
  }

  protected override async beforeContainerCreated(): Promise<void> {
    // Change the wait strategy to wait for a log message from a fake starter script
    // so that we can put a real starter script in place at that moment
    this.originalWaitinStrategy = this.waitStrategy;
    this.waitStrategy = Wait.forLogMessage(WAIT_FOR_SCRIPT_MESSAGE);
    this.withEntrypoint(["sh"]);
    this.withCommand([
      "-c",
      `echo '${WAIT_FOR_SCRIPT_MESSAGE}'; while [ ! -f ${STARTER_SCRIPT} ]; do sleep 0.1; done; ${STARTER_SCRIPT}`,
    ]);
  }

  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    const command = "#!/bin/bash\nrpk redpanda start --mode dev-container --smp=1 --memory=1G";
    await container.copyContentToContainer([{ content: command, target: STARTER_SCRIPT, mode: 0o777 }]);
    await container.copyContentToContainer([
      {
        content: this.renderRedpandaFile(container.getHost(), container.getMappedPort(REDPANDA_PORT)),
        target: "/etc/redpanda/redpanda.yaml",
      },
    ]);

    const client = await getContainerRuntimeClient();
    const dockerContainer = client.container.getById(container.getId());
    const boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult).filter(
      this.exposedPorts
    );
    await waitForContainer(client, dockerContainer, this.originalWaitinStrategy, boundPorts);
  }

  private renderRedpandaFile(host: string, port: number): string {
    const template = compile(fs.readFileSync(path.join(__dirname, "assets", "redpanda.yaml.hbs"), "utf-8"));
    return template({
      kafkaApi: {
        advertisedHost: host,
        advertisedPort: port,
      },
    });
  }
}

export class StartedRedpandaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getBootstrapServers(): string {
    return `${this.getHost()}:${this.getMappedPort(REDPANDA_PORT)}`;
  }

  public getSchemaRegistryAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(SCHEMA_REGISTRY_PORT)}`;
  }

  public getAdminAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(REDPANDA_ADMIN_PORT)}`;
  }

  public getRestProxyAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(REST_PROXY_PORT)}`;
  }
}
