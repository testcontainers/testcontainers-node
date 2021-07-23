import { REAPER_IMAGE } from "./reaper";
import { SSHD_IMAGE } from "./port-forwarder";

export type Registry = string;
export type Image = string;
export type Tag = string;

export class DockerImageName {
  private readonly string: string;
  private static readonly HELPER_CONTAINERS = new Set([REAPER_IMAGE, SSHD_IMAGE]);

  constructor(public readonly registry: Registry | undefined, public readonly image: Image, public readonly tag: Tag) {
    if (this.registry) {
      this.string = `${this.registry}/${this.image}:${this.tag}`;
    } else {
      this.string = `${this.image}:${this.tag}`;
    }
  }

  public equals(other: DockerImageName): boolean {
    return this.registry === other.registry && this.image === other.image && this.tag === other.tag;
  }

  public toString(): string {
    return this.string;
  }

  public isReaper(): boolean {
    return this.string === REAPER_IMAGE;
  }

  public isHelperContainer(): boolean {
    return DockerImageName.HELPER_CONTAINERS.has(this.string);
  }

  public static fromString(string: string): DockerImageName {
    const registry = this.getRegistry(string);
    const stringWithoutRegistry = registry ? string.split("/").slice(1).join("/") : string;

    if (stringWithoutRegistry.includes("@")) {
      const [image, tag] = stringWithoutRegistry.split("@");
      return new DockerImageName(registry, image, tag);
    } else if (stringWithoutRegistry.includes(":")) {
      const [image, tag] = stringWithoutRegistry.split(":");
      return new DockerImageName(registry, image, tag);
    } else {
      return new DockerImageName(registry, stringWithoutRegistry, "latest");
    }
  }

  private static getRegistry(string: string): string | undefined {
    const parts = string.split("/");

    if (parts.length > 1 && this.isRegistry(parts[0])) {
      return parts[0];
    }
  }

  private static isRegistry(string: string): boolean {
    return string.includes(".") || string.includes(":") || string === "localhost";
  }
}
