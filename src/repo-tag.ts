import { ReaperInstance } from "./reaper";
import { PortForwarderInstance } from "./port-forwarder";

export type Image = string;
export type Tag = string;

export class RepoTag {
  private readonly HELPER_CONTAINERS = new Set([ReaperInstance.IMAGE_NAME, PortForwarderInstance.IMAGE_NAME]);

  constructor(private readonly image: Image, private readonly tag: Tag) {}

  public equals(repoTag: RepoTag): boolean {
    return this.image === repoTag.image && this.tag === repoTag.tag;
  }

  public toString(): string {
    return `${this.image}:${this.tag}`;
  }

  public isReaper(): boolean {
    return this.image === ReaperInstance.IMAGE_NAME;
  }

  public isHelperContainer(): boolean {
    return this.HELPER_CONTAINERS.has(this.image);
  }
}
