import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const GRPC_PORT = 9010;

/**
 * SpannerEmulatorContainer runs the Cloud Spanner emulator via the GCloud CLI image.
 */
export class SpannerEmulatorContainer extends GenericContainer {
  private projectId?: string;

  constructor(image: string) {
    super(image);

    // only gRPC port is supported
    this.withExposedPorts(GRPC_PORT).withWaitStrategy(Wait.forLogMessage(/.*Cloud Spanner emulator running\..*/, 1));
  }

  /**
   * Sets the GCP project ID to use with the emulator.
   */
  public withProjectId(projectId: string): this {
    this.projectId = projectId;
    return this;
  }

  public override async start(): Promise<StartedSpannerEmulatorContainer> {
    const selectedProject = this.projectId ?? "test-project";

    const started = await super.start();
    return new StartedSpannerEmulatorContainer(started, selectedProject);
  }
}

/**
 * A running Spanner emulator instance with endpoint getters and helper access.
 */
export class StartedSpannerEmulatorContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly projectId: string
  ) {
    super(startedTestContainer);
  }

  /**
   * @returns host:port for gRPC.
   */
  public getEmulatorGrpcEndpoint(): string {
    return `${this.getHost()}:${this.getMappedPort(GRPC_PORT)}`;
  }

  /**
   * @returns the GCP project ID used by the emulator.
   */
  public getProjectId(): string {
    return this.projectId;
  }
}
