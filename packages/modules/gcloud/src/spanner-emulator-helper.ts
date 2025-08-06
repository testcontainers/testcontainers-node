import type { Spanner } from "@google-cloud/spanner";
import type { IInstance } from "@google-cloud/spanner/build/src/instance";
import type { StartedSpannerEmulatorContainer } from "./spanner-emulator-container";

/**
 * Helper class that encapsulates all Spanner client interactions against the emulator.
 * Clients and configs are lazily instantiated.
 */
export class SpannerEmulatorHelper {
  private clientInstance?: Spanner;
  private instanceAdminClientInstance?: ReturnType<Spanner["getInstanceAdminClient"]>;
  private databaseAdminClientInstance?: ReturnType<Spanner["getDatabaseAdminClient"]>;
  private instanceConfigValue?: string;

  constructor(private readonly emulator: StartedSpannerEmulatorContainer) {}

  /**
   * Lazily get or create the Spanner client.
   */
  public async client(): Promise<Spanner> {
    const { Spanner } = await import("@google-cloud/spanner");
    this.clientInstance ??= new Spanner({
      projectId: this.emulator.getProjectId(),
      apiEndpoint: this.emulator.getHost(),
      port: this.emulator.getGrpcPort(),
      sslCreds: this.emulator.getSslCredentials(),
      // Provide fake credentials so the auth library never tries metadata
      credentials: {
        client_email: "test@example.com",
        private_key: "not-a-real-key",
      },
    });
    return this.clientInstance;
  }

  /**
   * Lazily get or create the InstanceAdminClient.
   */
  private async instanceAdminClient(): Promise<ReturnType<Spanner["getInstanceAdminClient"]>> {
    this.instanceAdminClientInstance ??= (await this.client()).getInstanceAdminClient();
    return this.instanceAdminClientInstance;
  }

  /**
   * Lazily get or create the DatabaseAdminClient.
   */
  private async databaseAdminClient(): Promise<ReturnType<Spanner["getDatabaseAdminClient"]>> {
    this.databaseAdminClientInstance ??= (await this.client()).getDatabaseAdminClient();
    return this.databaseAdminClientInstance;
  }

  /**
   * Lazily compute the instanceConfig path.
   */
  public async instanceConfig(): Promise<string> {
    this.instanceConfigValue ??= (await this.instanceAdminClient()).instanceConfigPath(
      this.emulator.getProjectId(),
      "emulator-config"
    );
    return this.instanceConfigValue;
  }

  /**
   * Creates a new Spanner instance in the emulator.
   */
  public async createInstance(instanceId: string, options?: IInstance): Promise<unknown> {
    const [operation] = await (
      await this.instanceAdminClient()
    ).createInstance({
      instanceId,
      parent: (await this.instanceAdminClient()).projectPath(this.emulator.getProjectId()),
      instance: options,
    });
    const [result] = await operation.promise();
    return result;
  }

  /**
   * Deletes an existing Spanner instance in the emulator.
   */
  public async deleteInstance(instanceId: string): Promise<void> {
    await (await this.client()).instance(instanceId).delete();
  }

  /**
   * Creates a new database under the specified instance in the emulator.
   */
  public async createDatabase(instanceId: string, databaseId: string): Promise<unknown> {
    const [operation] = await (
      await this.databaseAdminClient()
    ).createDatabase({
      parent: (await this.databaseAdminClient()).instancePath(this.emulator.getProjectId(), instanceId),
      createStatement: `CREATE DATABASE \`${databaseId}\``,
    });
    const [result] = await operation.promise();
    return result;
  }

  /**
   * Deletes a database under the specified instance in the emulator.
   */
  public async deleteDatabase(instanceId: string, databaseId: string): Promise<void> {
    await (await this.client()).instance(instanceId).database(databaseId).delete();
  }
}
