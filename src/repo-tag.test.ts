import { RepoTag } from "./repo-tag";

describe("RepoTag", () => {
  it("should produce a string representation", () => {
    const repoTag = new RepoTag("image", "tag");
    expect(repoTag.toString()).toBe("image:tag");
  });

  it("should return whether it is equal to another RepoTag", () => {
    const repoTag = new RepoTag("image", "tag");

    expect(repoTag.isEqual(new RepoTag("image", "tag"))).toBe(true);
    expect(repoTag.isEqual(new RepoTag("image", "anotherTag"))).toBe(false);
    expect(repoTag.isEqual(new RepoTag("anotherImage", "tag"))).toBe(false);
  });
});
