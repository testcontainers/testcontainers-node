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
    const parts = string.split("/");

    if (parts.length === 1) {
      return this.fromStringWithoutRegistry(parts);
    } else {
      return this.fromStringWithRegistry(parts);
    }
  }

  private static fromStringWithoutRegistry(parts: string[]) {
    const [imageName, tag = "latest"] = parts[0].split(":");
    return new RepoTag(undefined, imageName, tag);
  }

  private static fromStringWithRegistry(parts: string[]) {
    const registry = parts[0];
    const [image, tag = "latest"] = parts.slice(1).join("/").split(":");
    return new RepoTag(registry, image, tag);
  }
}
