import { RepoTag } from "./repo-tag";

describe("RepoTag", () => {
    it("should produce a string representation", () => {
        const repoTag = new RepoTag("image", "tag");
        expect(repoTag.toString()).toBe("image:tag");
    });
});
