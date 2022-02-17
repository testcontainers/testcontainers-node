export class EnvConfig {
  public static isHostOverriden(): string {
    return process.env["TESTCONTAINERS_HOST_OVERRIDE"] ?? "";
  }

  public static riukContainerImage(): string {
    return process.env["RYUK_CONTAINER_IMAGE"] ?? "testcontainers/ryuk:0.3.2";
  }

  public static sshdContainerImage(): string {
    return process.env["SSHD_CONTAINER_IMAGE"] ?? "testcontainers/sshd:1.0.0";
  }

  public static isRyukDisabled(): boolean {
    return EnvConfig.boolean("TESTCONTAINERS_RYUK_DISABLED") ?? false;
  }

  public static isRyukPrivileged(): boolean {
    return EnvConfig.boolean("TESTCONTAINERS_RYUK_PRIVILEGED") ?? false;
  }

  public static dockerSocketOverride(): string {
    return process.env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] ?? "/var/run/docker.sock";
  }

  public static defaultSetupTimeout(): number {
    return EnvConfig.integer("TESTCONTAINERS_DEFAULT_STARTUP_TIMEOUT") ?? 60_000;
  }

  private static boolean(key: string): boolean {
    return process.env[key] === "true";
  }

  private static integer(key: string): number {
    return parseInt(process.env[key] || "");
  }
}
