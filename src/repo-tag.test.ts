import { RepoTag } from "./repo-tag";
import { ReaperInstance } from "./reaper";

describe("RepoTag", () => {
  it("should return whether two repo tags are equal", () => {
    const repoTag = new RepoTag("registry", "image", "tag");
    expect(repoTag.equals(new RepoTag("registry", "image", "tag"))).toBe(true);
    expect(repoTag.equals(new RepoTag("registry", "image", "anotherTag"))).toBe(false);
    expect(repoTag.equals(new RepoTag("registry", "anotherImage", "tag"))).toBe(false);
    expect(repoTag.equals(new RepoTag("anotherRegistry", "image", "tag"))).toBe(false);
  });

  it("should produce a string representation without registry", () => {
    const repoTag = new RepoTag(undefined, "image", "tag");
    expect(repoTag.toString()).toBe("image:tag");
  });

  it("should produce a string representation with registry", () => {
    const repoTag = new RepoTag("registry", "image", "tag");
    expect(repoTag.toString()).toBe("registry/image:tag");
  });

  it("should return whether the repo tag is for a Reaper", () => {
    const reaper = RepoTag.fromString(ReaperInstance.getImage());
    const notReaper = new RepoTag("quay.io", "testcontainers/notReaper", "latest");

    expect(reaper.isReaper()).toBe(true);
    expect(notReaper.isReaper()).toBe(false);
  });

  describe("fromString", () => {
    it("should work", () => {
      const repoTag = RepoTag.fromString("image:latest");
      expect(repoTag.equals(new RepoTag(undefined, "image", "latest"))).toBe(true);
    });

    it("should work with registry", () => {
      const repoTag = RepoTag.fromString("domain:5000/image:latest");
      expect(repoTag.equals(new RepoTag("domain:5000", "image", "latest"))).toBe(true);
    });
  });
});
