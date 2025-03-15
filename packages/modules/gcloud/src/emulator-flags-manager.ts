export class EmulatorFlagsManager {
  private flags: { name: string; value: string }[] = [];

  /**
   * Adds flag as argument to emulator start command.
   * Adding same flag name twice replaces existing flag value.
   * @param name flag name. Must be set to non-empty string. May optionally contain -- prefix.
   * @param value flag value. May be empty string.
   * @returns this instance for chaining.
   */
  public withFlag(name: string, value: string): this {
    if (!name) throw new Error("Flag name must be set.");
    // replace flag if it already exists
    const idx = this.flags.findIndex((f) => f.name == this.trimFlagName(name));
    if (idx >= 0) this.flags = [...this.flags.slice(0, idx), ...this.flags.slice(idx + 1)];
    this.flags.push({ name, value });
    return this;
  }

  private trimFlagName(name: string): string {
    return name?.startsWith("--") ? name.slice(2) : name;
  }

  private flagToString(f: { name: string; value: string }): string {
    return `--${this.trimFlagName(f.name)}=${f.value}`;
  }

  /**
   *
   * @returns string with all flag names and values, concatenated in same order they were added.
   */
  public expandFlags(): string {
    return `${this.flags.reduce((p, c) => p + " " + this.flagToString(c), "")}`;
  }

  /**
   * Clears all added flags.
   */
  public clearFlags() {
    this.flags = [];
  }
}
