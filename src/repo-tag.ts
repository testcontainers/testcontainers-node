export class RepoTag {
    constructor(private readonly image: string, private readonly tag: string) {}

    public toString(): string {
        return `${this.image}:${this.tag}`;
    }
}
