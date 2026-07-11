import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const MQTT_PORT = 1883;
const CONFIG_PATH = "/mosquitto/config/mosquitto.conf";
const PASSWORD_FILE_PATH = "/mosquitto/config/passwords";

export class MosquittoContainer extends GenericContainer {
  private username?: string;
  private password?: string;

  constructor(image: string) {
    super(image);
    this.withExposedPorts(MQTT_PORT).withWaitStrategy(Wait.forListeningPorts()).withStartupTimeout(120_000);
  }

  public withUsername(username: string): this {
    if (!username) throw new Error("Username should not be empty.");
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    if (!password) throw new Error("Password should not be empty.");
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedMosquittoContainer> {
    if ((this.username === undefined) !== (this.password === undefined)) {
      throw new Error("Both username and password must be set together.");
    }

    if (this.username !== undefined && this.password !== undefined) {
      const config = `listener ${MQTT_PORT}\npassword_file ${PASSWORD_FILE_PATH}\n`;
      this.withCopyContentToContainer([{ content: config, target: CONFIG_PATH }])
        .withEnvironment({ MQTT_USER: this.username, MQTT_PASS: this.password })
        .withEntrypoint(["/bin/sh"])
        .withCommand([
          "-c",
          `mosquitto_passwd -b -c "${PASSWORD_FILE_PATH}" "$MQTT_USER" "$MQTT_PASS" && chown mosquitto:mosquitto "${PASSWORD_FILE_PATH}" && exec mosquitto -c "${CONFIG_PATH}"`,
        ]);
    } else {
      const config = `listener ${MQTT_PORT}\nallow_anonymous true\n`;
      this.withCopyContentToContainer([{ content: config, target: CONFIG_PATH }]);
    }

    return new StartedMosquittoContainer(await super.start(), this.username, this.password);
  }
}

export class StartedMosquittoContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username?: string,
    private readonly password?: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(MQTT_PORT);
  }

  public getConnectionString(): string {
    if (this.username && this.password) {
      return `mqtt://${encodeURIComponent(this.username)}:${encodeURIComponent(this.password)}@${this.getHost()}:${this.getPort()}`;
    }
    return `mqtt://${this.getHost()}:${this.getPort()}`;
  }
}
