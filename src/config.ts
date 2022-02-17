export class EnvConfig {
  public static isHostOverriden(): string {
    return EnvConfig.string("TESTCONTAINERS_HOST_OVERRIDE", "");
  }

  public static riukContainerImage(): string {
    return EnvConfig.string("RYUK_CONTAINER_IMAGE", "testcontainers/ryuk:0.3.2");
  }

  public static sshdContainerImage(): string {
    return EnvConfig.string("SSHD_CONTAINER_IMAGE", "testcontainers/sshd:1.0.0");
  }

  public static isRyukDisabled(): boolean {
    return EnvConfig.boolean("TESTCONTAINERS_RYUK_DISABLED");
  }

  public static isRyukPrivileged(): boolean {
    return EnvConfig.boolean("TESTCONTAINERS_RYUK_PRIVILEGED");
  }

  public static dockerSocketOverride(): string {
    return EnvConfig.string("TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE", "/var/run/docker.sock");
  }

  public static defaultSetupTimeout(): number {
    return EnvConfig.integer("TESTCONTAINERS_DEFAULT_STARTUP_TIMEOUT", 60_000);
  }

  private static boolean(key: string): boolean {
    return process.env[key] === "true";
  }

  private static string(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
  }

  private static integer(key: string, fallback: number): number {
    const int = parseInt(process.env[key] || "");
    return isNaN(int) ? fallback : int;
  }
}
