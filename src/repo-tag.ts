import { ReaperInstance } from "./reaper";
import { PortForwarderInstance } from "./port-forwarder";

export type Registry = string;
export type Image = string;
export type Tag = string;

export class RepoTag {
  private readonly string: string;
  private readonly HELPER_CONTAINERS = new Set([ReaperInstance.getImage(), PortForwarderInstance.IMAGE_NAME]);

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
    return this.toString() === ReaperInstance.getImage();
  }

  public isHelperContainer(): boolean {
    return this.HELPER_CONTAINERS.has(this.image);
  }

  public static fromString(string: string): RepoTag {
    const parts = string.split("/");

    if (parts.length === 1) {
      const [imageName, tag] = parts[0].split(":");
      return new RepoTag(undefined, imageName, tag);
    } else {
      const [imageName, tag] = parts[1].split(":");
      return new RepoTag(parts[0], imageName, tag);
    }
  }
}
