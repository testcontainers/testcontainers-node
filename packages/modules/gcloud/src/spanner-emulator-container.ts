import { Spanner } from "@google-cloud/spanner";
import type { IInstance } from "@google-cloud/spanner/build/src/instance";
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

  /**
   * @returns a helper for Spanner resource operations against the emulator.
   */
  public get helper(): SpannerEmulatorHelper {
    return new SpannerEmulatorHelper(this);
  }
}

/**
 * Helper class that encapsulates all Spanner client interactions against the emulator.
 * Clients and configs are lazily instantiated; user must call setAsEmulatorHost().
 */
export class SpannerEmulatorHelper {
  private clientInstance?: Spanner;
  private instanceAdminClientInstance?: ReturnType<Spanner["getInstanceAdminClient"]>;
  private databaseAdminClientInstance?: ReturnType<Spanner["getDatabaseAdminClient"]>;
  private instanceConfigValue?: string;

  constructor(private readonly emulator: StartedSpannerEmulatorContainer) {}

  /**
   * Must be called by the user to configure the SPANNER_EMULATOR_HOST env var.
   */
  public setAsEmulatorHost(): void {
    process.env.SPANNER_EMULATOR_HOST = this.emulator.getEmulatorGrpcEndpoint();
  }

  /**
   * Lazily get or create the Spanner client.
   */
  public get client(): Spanner {
    if (!this.clientInstance) {
      if (!process.env.SPANNER_EMULATOR_HOST) {
        throw new Error("SPANNER_EMULATOR_HOST is not set. Call setAsEmulatorHost() before using the client.");
      }
      // Provide fake credentials so the auth library never tries metadata
      this.clientInstance = new Spanner({
        projectId: this.emulator.getProjectId(),
        credentials: {
          client_email: "test@example.com",
          private_key: "not-a-real-key",
        },
      });
    }
    return this.clientInstance;
  }

  /**
   * Lazily get or create the InstanceAdminClient.
   */
  private get instanceAdminClient(): ReturnType<Spanner["getInstanceAdminClient"]> {
    if (!this.instanceAdminClientInstance) {
      this.instanceAdminClientInstance = this.client.getInstanceAdminClient();
    }
    return this.instanceAdminClientInstance;
  }

  /**
   * Lazily get or create the DatabaseAdminClient.
   */
  private get databaseAdminClient(): ReturnType<Spanner["getDatabaseAdminClient"]> {
    if (!this.databaseAdminClientInstance) {
      this.databaseAdminClientInstance = this.client.getDatabaseAdminClient();
    }
    return this.databaseAdminClientInstance;
  }

  /**
   * Lazily compute the instanceConfig path.
   */
  public get instanceConfig(): string {
    if (!this.instanceConfigValue) {
      this.instanceConfigValue = this.instanceAdminClient.instanceConfigPath(
        this.emulator.getProjectId(),
        "emulator-config"
      );
    }
    return this.instanceConfigValue;
  }

  /**
   * Creates a new Spanner instance in the emulator.
   */
  public async createInstance(instanceId: string, options?: IInstance): Promise<unknown> {
    const [operation] = await this.instanceAdminClient.createInstance({
      instanceId,
      parent: this.instanceAdminClient.projectPath(this.emulator.getProjectId()),
      instance: options,
    });
    const [result] = await operation.promise();
    return result;
  }

  /**
   * Deletes an existing Spanner instance in the emulator.
   */
  public async deleteInstance(instanceId: string): Promise<void> {
    await this.client.instance(instanceId).delete();
  }

  /**
   * Creates a new database under the specified instance in the emulator.
   */
  public async createDatabase(instanceId: string, databaseId: string): Promise<unknown> {
    const [operation] = await this.databaseAdminClient.createDatabase({
      parent: this.databaseAdminClient.instancePath(this.emulator.getProjectId(), instanceId),
      createStatement: `CREATE DATABASE \`${databaseId}\``,
    });
    const [result] = await operation.promise();
    return result;
  }

  /**
   * Deletes a database under the specified instance in the emulator.
   */
  public async deleteDatabase(instanceId: string, databaseId: string): Promise<void> {
    await this.client.instance(instanceId).database(databaseId).delete();
  }
}
