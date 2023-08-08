import path from "path";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const START_LOG_MESSAGE_REGEX = /(.*)Started HiveMQ in(.*)/i;
const HIVEMQ_BASE_PATH = "/opt/hivemq";
const MQTT_PORT = 1883;

export class HiveMQContainer extends GenericContainer {
  constructor(image = "hivemq/hivemq-ce:2023.5") {
    super(image);

    this.withExposedPorts(...(this.hasExposedPorts ? this.exposedPorts : [MQTT_PORT]))
      .withWaitStrategy(Wait.forLogMessage(START_LOG_MESSAGE_REGEX))
      .withTmpFs({
        [path.join(HIVEMQ_BASE_PATH, "log")]: "rw",
        [path.join(HIVEMQ_BASE_PATH, "data")]: "rw",
      })
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedHiveMQContainer> {
    return new StartedHiveMQContainer(await super.start());
  }
}

export class StartedHiveMQContainer extends AbstractStartedContainer {
  private readonly port: number;

  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
    this.port = startedTestContainer.getMappedPort(MQTT_PORT);
  }

  public getPort(): number {
    return this.port;
  }

  public getConnectionString(): string {
    return `mqtt://${this.getHost()}:${this.getPort()}`;
  }
}
