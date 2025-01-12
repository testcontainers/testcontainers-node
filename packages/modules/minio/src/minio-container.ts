import { AbstractStartedContainer, GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

const MINIO_PORT = 9000;
const MINIO_UI_PORT = 9001;

export class MinioContainer extends GenericContainer {
  private username = "minioadmin";
  private password = "minioadmin";

  constructor(image = "minio/minio:RELEASE.2024-12-13T22-19-12Z") {
    super(image);
    this.withExposedPorts(MINIO_PORT, MINIO_UI_PORT);
    this.withWaitStrategy(Wait.forAll([Wait.forHttp("/minio/health/live", MINIO_PORT)]));
    this.withCommand(["server", "--console-address", `:${MINIO_UI_PORT}`, "/data"]);
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedMinioContainer> {
    this.withEnvironment({
      MINIO_ROOT_USER: this.username,
      MINIO_ROOT_PASSWORD: this.password,
    });
    const startedContainer = await super.start();
    return new StartedMinioContainer(startedContainer, this.username, this.password);
  }
}

export class StartedMinioContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(MINIO_PORT);
  }

  public getUiPort(): number {
    return this.startedTestContainer.getMappedPort(MINIO_UI_PORT);
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getConnectionUrl(): string {
    return `http://${this.getHost()}:${this.getPort()}`;
  }
}
