import { Spanner } from "@google-cloud/spanner";
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
  public get client(): Spanner {
    this.clientInstance ??= new Spanner({
      projectId: this.emulator.getProjectId(),
      apiEndpoint: this.emulator.getHost(),
      port: this.emulator.getGrpcPort(),
      sslCreds: this.emulator.getSslCredentials(),
    });
    return this.clientInstance;
  }

  /**
   * Lazily get or create the InstanceAdminClient.
   */
  private get instanceAdminClient(): ReturnType<Spanner["getInstanceAdminClient"]> {
    this.instanceAdminClientInstance ??= this.client.getInstanceAdminClient();
    return this.instanceAdminClientInstance;
  }

  /**
   * Lazily get or create the DatabaseAdminClient.
   */
  private get databaseAdminClient(): ReturnType<Spanner["getDatabaseAdminClient"]> {
    this.databaseAdminClientInstance ??= this.client.getDatabaseAdminClient();
    return this.databaseAdminClientInstance;
  }

  /**
   * Lazily compute the instanceConfig path.
   */
  public get instanceConfig(): string {
    this.instanceConfigValue ??= this.instanceAdminClient.instanceConfigPath(
      this.emulator.getProjectId(),
      "emulator-config"
    );
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
