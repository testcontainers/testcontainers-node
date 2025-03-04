import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const WEAVIATE_HTTP_PORT = 8080;
const WEAVIATE_GRPC_PORT = 50051;

export class WeaviateContainer extends GenericContainer {
  constructor(image = "semitechnologies/weaviate:1.29.0") {
    super(image);
    this.withCommand(["--host", "0.0.0.0", "--scheme", "http", "--port", `${WEAVIATE_HTTP_PORT}`]);
    this.withExposedPorts(WEAVIATE_HTTP_PORT, WEAVIATE_GRPC_PORT);
    this.withEnvironment({
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true",
      PERSISTENCE_DATA_PATH: "/var/lib/weaviate",
    });
    this.withWaitStrategy(
      Wait.forAll([
        Wait.forListeningPorts(),
        Wait.forHttp("/v1/.well-known/ready", WEAVIATE_HTTP_PORT),
      ]).withStartupTimeout(5_000)
    );
  }

  public override async start(): Promise<StartedWeaviateContainer> {
    return new StartedWeaviateContainer(await super.start());
  }
}

export class StartedWeaviateContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getHttpHostAddress(): string {
    return `${this.getHost()}:${this.getMappedPort(WEAVIATE_HTTP_PORT)}`;
  }

  public getGrpcHostAddress(): string {
    return `${this.getHost()}:${this.getMappedPort(WEAVIATE_GRPC_PORT)}`;
  }
}
