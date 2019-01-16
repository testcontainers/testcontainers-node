export declare type Image = string;
export declare type Tag = string;
export declare class RepoTag {
    private readonly image;
    private readonly tag;
    constructor(image: Image, tag: Tag);
    isEqual(repoTag: RepoTag): boolean;
    toString(): string;
}
