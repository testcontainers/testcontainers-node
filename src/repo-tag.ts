import { ReaperInstance } from "./reaper";
import { PortForwarderInstance } from "./port-forwarder";

export type Registry = string;
export type Image = string;
export type Tag = string;

export class RepoTag {
  private readonly string: string;
  private readonly HELPER_CONTAINERS = new Set([ReaperInstance.getImage(), PortForwarderInstance.getImage()]);

  constructor(public readonly registry: Registry | undefined, public readonly image: Image, public readonly tag: Tag) {
    if (this.registry) {
      this.string = `${this.registry}/${this.image}:${this.tag}`;
    } else {
      this.string = `${this.image}:${this.tag}`;
    }
  }

  public equals(repoTag: RepoTag): boolean {
    return this.registry === repoTag.registry && this.image === repoTag.image && this.tag === repoTag.tag;
  }

  public toString(): string {
    return this.string;
  }

  public isReaper(): boolean {
    return this.string === ReaperInstance.getImage();
  }

  public isHelperContainer(): boolean {
    return this.HELPER_CONTAINERS.has(this.string);
  }

  public static fromString(string: string): RepoTag {
    const registry = this.getRegistry(string);
    const stringWithoutRegistry = registry ? string.split("/").slice(1).join("/") : string;

    if (stringWithoutRegistry.includes("@")) {
      const [image, tag] = stringWithoutRegistry.split("@");
      return new RepoTag(registry, image, tag);
    } else if (stringWithoutRegistry.includes(":")) {
      const [image, tag] = stringWithoutRegistry.split(":");
      return new RepoTag(registry, image, tag);
    } else {
      return new RepoTag(registry, stringWithoutRegistry, "latest");
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
