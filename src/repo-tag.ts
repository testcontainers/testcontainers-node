export type Image = string;
export type Tag = string;

export class RepoTag {
  constructor(private readonly image: Image, private readonly tag: Tag) {}

  public toString(): string {
    return `${this.image}:${this.tag}`;
  }
}
