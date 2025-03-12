import { GenericContainer } from "testcontainers";

export class GenericGCloudEmulatorContainer extends GenericContainer {
    private flags: { name: string, value: string }[] = []

    constructor(image: string) {
        super(image);
    }

    /**
     * Adds flag name and value as argument to emulator start command.
     * Adding same flag name twice replaces existing flag value.
     * Provided flag name may optionally contain -- prefix.
     */
    public withFlag(name: string, value: string): this {
        if (!name) throw new Error("Flag name must be set.")
        // replace flag if it already exists
        const idx = this.flags.findIndex(f => f.name == this.trimFlagName(name))
        if (idx >= 0)
            this.flags = [...this.flags.slice(0, idx), ...this.flags.slice(idx + 1)]
        this.flags.push({ name, value });
        return this
    }

    private trimFlagName(name: string): string {
        return name?.startsWith('--') ? name.slice(2) : name
    }

    private flagToString(f: { name: string, value: string }): string {
        return `--${this.trimFlagName(f.name)}=${f.value}`
    }

    /**
     * @return all flags provided to run this emulator instance, concatenated to string.
     */
    public expandFlags(): string {
        return `${this.flags.reduce((p, c) => p + ' ' + this.flagToString(c), '')}`
    }
}
