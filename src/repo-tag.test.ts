import { RepoTag } from "./repo-tag";
import { Reaper } from "./reaper";

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

  it("should return whether the repo tag is for a Reaper", () => {
    const reaper = new RepoTag(Reaper.IMAGE_NAME, "latest");
    const notReaper = new RepoTag("quay.io/testcontainers/notReaper", "latest");

    expect(reaper.isReaper()).toBe(true);
    expect(notReaper.isReaper()).toBe(false);
  });
});
