export class EmulatorFlagsManager {
  private flags: { [name: string]: string } = {};

  /**
   * Adds flag as argument to emulator start command.
   * Adding same flag name twice replaces existing flag value.
   * @param name flag name. Must be set to non-empty string. May optionally contain -- prefix.
   * @param value flag value. May be empty string.
   * @returns this instance for chaining.
   */
  public withFlag(name: string, value: string): this {
    if (!name) throw new Error("Flag name must be set.");
    if (name.startsWith("--")) this.flags[name] = value;
    else this.flags[`--${name}`] = value;
    return this;
  }

  private flagToString(name: string, value: string): string {
    return `${name}${value ? "=" + value : ""}`;
  }

  /**
   *
   * @returns string with all flag names and values, concatenated in same order they were added.
   */
  public expandFlags(): string {
    return `${Object.keys(this.flags).reduce((p, c) => p + " " + this.flagToString(c, this.flags[c]), "")}`;
  }

  /**
   * Clears all added flags.
   */
  public clearFlags() {
    this.flags = {};
  }
}
