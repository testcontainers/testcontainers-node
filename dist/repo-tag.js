"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RepoTag {
    constructor(image, tag) {
        this.image = image;
        this.tag = tag;
    }
    isEqual(repoTag) {
        return this.image === repoTag.image && this.tag === repoTag.tag;
    }
    toString() {
        return `${this.image}:${this.tag}`;
    }
}
exports.RepoTag = RepoTag;
