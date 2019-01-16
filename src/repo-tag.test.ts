import { RepoTag } from "./repo-tag";

describe("RepoTag", () => {
  it("should return whether two repo tags are equal", () => {
    const repoTag = new RepoTag("image", "tag");
    expect(repoTag.equals(new RepoTag("image", "tag"))).toBe(true);
    expect(repoTag.equals(new RepoTag("image", "anotherTag"))).toBe(false);
    expect(repoTag.equals(new RepoTag("anotherImage", "tag"))).toBe(false);
  });

  it("should produce a string representation", () => {
    const repoTag = new RepoTag("image", "tag");
    expect(repoTag.toString()).toBe("image:tag");
  });
});
