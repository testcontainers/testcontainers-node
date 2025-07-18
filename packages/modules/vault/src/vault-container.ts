import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

const VAULT_PORT = 8200;

/**
 * Testcontainers module for HashiCorp Vault.
 *
 * This container exposes Vault on port 8200, sets up a wait strategy using the health check endpoint, and supports:
 * - Supplying a root token
 * - Executing post-start CLI init commands
 */
export class VaultContainer extends GenericContainer {
  private readonly initCommands: string[] = [];
  private token?: string;

  /**
   * Constructs a VaultContainer with a default image and healthcheck strategy.
   *
   * - Sets VAULT_ADDR to internal container address
   * - Adds IPC_LOCK capability (required by Vault)
   * - Exposes Vault on port 8200
   * - Waits for HTTP 200 response from /v1/sys/health
   * @param image Docker image to use (e.g. `hashicorp/vault:1.13.0`)
   */
  constructor(image: string) {
    super(image);

    this.withExposedPorts(VAULT_PORT)
      .withEnvironment({ VAULT_ADDR: `http://0.0.0.0:${VAULT_PORT}` })
      .withAddedCapabilities("IPC_LOCK")
      .withWaitStrategy(Wait.forHttp("/v1/sys/health", VAULT_PORT).forStatusCode(200));
  }

  /**
   * Sets a root token to be used with Vault, passed via environment variables.
   *
   * @param token Vault root token
   * @returns this
   */
  public withVaultToken(token: string): this {
    this.token = token;
    this.withEnvironment({
      VAULT_DEV_ROOT_TOKEN_ID: token,
      VAULT_TOKEN: token,
    });
    return this;
  }

  /**
   * Registers one or more Vault CLI init commands to be run after container starts.
   *
   * Example:
   *   .withInitCommands("secrets enable transit", "kv put secret/foo bar=baz")
   *
   * @param commands Vault CLI commands (without `vault` prefix)
   * @returns this
   */
  public withInitCommands(...commands: string[]): this {
    this.initCommands.push(...commands);
    return this;
  }

  /**
   * Starts the Vault container and executes any registered init commands.
   *
   * Wraps the base container in a StartedVaultContainer with helper accessors.
   */
  public override async start(): Promise<StartedVaultContainer> {
    const started = await super.start();
    const container = new StartedVaultContainer(started, this.token);

    if (this.initCommands.length > 0) {
      await container.execVaultCommands(this.initCommands);
    }

    return container;
  }
}

/**
 * A running Vault container, with accessors for port, address, and exec helper.
 */
export class StartedVaultContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: AbstractStartedContainer["startedTestContainer"],
    private readonly token?: string
  ) {
    super(startedTestContainer);
  }

  /**
   * Returns the mapped host port for Vault (default: 8200).
   */
  public getVaultPort(): number {
    return this.getMappedPort(VAULT_PORT);
  }

  /**
   * Returns the full Vault HTTP address (e.g., http://localhost:32768).
   */
  public getAddress(): string {
    return `http://${this.getHost()}:${this.getVaultPort()}`;
  }

  /**
   * Returns the root token set at container creation time, if any.
   */
  public getRootToken(): string | undefined {
    return this.token;
  }

  /**
   * Executes a list of Vault CLI commands inside the container after it has started.
   *
   * This is typically used to pre-configure secret engines or seed test data.
   *
   * @param commands Array of CLI commands (without `vault` prefix)
   */
  public async execVaultCommands(commands: string[]): Promise<void> {
    const cmd = commands.map((c) => `vault ${c}`).join(" && ");
    const result = await this.exec(["/bin/sh", "-c", cmd]);

    if (result.exitCode !== 0) {
      throw new Error(`Vault init commands failed: ${result.output}`);
    }
  }
}
