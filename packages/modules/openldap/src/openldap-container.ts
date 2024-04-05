import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import path from "path";

const OPENLDAP_PORT = 1389;

export class OpenldapContainer extends GenericContainer {
  private readonly importFilePath = "/home/import.ldif";
  private username? = "admin";
  private password? = "adminpassword";
  private rootDn? = "dc=example,dc=org";
  private baseDn? = "cn=admin,dc=example,dc=org";
  private persistenceVolume? = "";
  private initialImportScriptFile? = "";

  constructor(image = "bitnami/openldap:latest") {
    super(image);
    this.withEnvironment({
      LDAP_ADMIN_USERNAME: this.username ?? "",
      LDAP_ADMIN_PASSWORD: this.password ?? "",
      LDAP_ROOT: this.rootDn ?? "",
      LDAP_BASE: this.baseDn ?? "",
    });
    this.withExposedPorts(OPENLDAP_PORT)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forAll([Wait.forLogMessage("slapd starting"), Wait.forListeningPorts()]));
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public withRootDn(rootDn: string): this {
    this.rootDn = rootDn;
    return this;
  }

  public withBaseDn(baseDn: string): this {
    this.baseDn = baseDn;
    return this;
  }

  public withPersistence(sourcePath: string): this {
    this.persistenceVolume = sourcePath;
    return this;
  }

  public withInitialLdif(importScriptFile: string): this {
    this.initialImportScriptFile = importScriptFile;
    return this;
  }

  public override async start(): Promise<StartedOpenldapContainer> {
    this.withEnvironment({
      LDAP_ADMIN_USERNAME: this.username ?? "",
      LDAP_ADMIN_PASSWORD: this.password ?? "",
      LDAP_ROOT: this.rootDn ?? "",
      LDAP_BASE: this.baseDn ?? "",
    });
    if (this.persistenceVolume) {
      this.withBindMounts([{ mode: "rw", source: this.persistenceVolume, target: "/data" }]);
    }
    if (this.initialImportScriptFile) {
      this.withCopyFilesToContainer([
        {
          mode: 777,
          source: this.initialImportScriptFile,
          target: this.importFilePath,
        },
        {
          mode: 777,
          source: path.join(__dirname, "import.sh"),
          target: "/tmp/import.sh",
        },
      ]);
    }
    const startedRedisContainer = new StartedOpenldapContainer(
      await super.start(),
      this.username,
      this.password,
      this.rootDn
    );
    if (this.initialImportScriptFile) await this.importInitialData(startedRedisContainer);
    return startedRedisContainer;
  }

  private async importInitialData(container: StartedOpenldapContainer) {
    const re = await container.exec(`/tmp/import.sh "${this.username},${this.rootDn}" ${this.password}`);
    if (re.exitCode != 0 || re.output.includes("ERR"))
      throw Error(`Could not import initial data from ${this.initialImportScriptFile}: ${re.output}`);
  }
}

export class StartedOpenldapContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly username?: string,
    private readonly password?: string,
    private readonly rootDn?: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.getMappedPort(OPENLDAP_PORT);
  }

  public getUsername(): string {
    return this.username ?? "";
  }

  public getPassword(): string {
    return this.password ?? "";
  }

  public getRootDn(): string {
    return this.rootDn ?? "";
  }

  public getConnectionUrl(): string {
    const url = new URL("", "ldap://");
    url.hostname = this.getHost();
    url.port = this.getPort().toString();
    return url.toString();
  }

  public async executeCliCmd(cmd: string, additionalFlags: string[] = []): Promise<string> {
    const result = await this.startedTestContainer.exec([
      "ldap-cli",
      ...(this.password != "" ? [`-a ${this.password}`] : []),
      `${cmd}`,
      ...additionalFlags,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`executeQuery failed with exit code ${result.exitCode} for query: ${cmd}. ${result.output}`);
    }
    return result.output;
  }
}
