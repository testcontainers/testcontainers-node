import path from "path";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const AMQP_PORT = 5672;
const AMQPS_PORT = 5671;
const HTTPS_PORT = 15671;
const HTTP_PORT = 15672;
const RABBITMQ_DEFAULT_USER = "guest";
const RABBITMQ_DEFAULT_PASS = "guest";
const RABBITMQ_CONFIG_FILE = "/etc/rabbitmq/default_config.conf";

export class RabbitMQContainer extends GenericContainer {
  constructor(image = "rabbitmq:3.12.11-management-alpine") {
    super(image);
    this.withExposedPorts(AMQP_PORT, AMQPS_PORT, HTTPS_PORT, HTTP_PORT)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER,
        RABBITMQ_DEFAULT_PASS,
        RABBITMQ_CONFIG_FILE,
      })
      .withWaitStrategy(Wait.forLogMessage("Server startup complete"))
      .withCopyFilesToContainer([
        {
          source: path.join(__dirname, "rabbitmq-testcontainers.conf"),
          target: RABBITMQ_CONFIG_FILE,
        },
      ])
      .withStartupTimeout(30_000);
  }

  public override async start(): Promise<StartedRabbitMQContainer> {
    return new StartedRabbitMQContainer(await super.start());
  }
}

export class StartedRabbitMQContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getAmqpUrl(): string {
    return `amqp://${this.getHost()}:${this.getMappedPort(AMQP_PORT)}`;
  }

  public getAmqpsUrl(): string {
    return `amqps://${this.getHost()}:${this.getMappedPort(AMQPS_PORT)}`;
  }
}
