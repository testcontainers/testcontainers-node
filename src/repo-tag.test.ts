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

      expect(repoTag.registry).toBeUndefined();
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work without tag", () => {
      const repoTag = RepoTag.fromString("image");

      expect(repoTag.registry).toBeUndefined();
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with registry", () => {
      const repoTag = RepoTag.fromString("domain.com/image:latest");

      expect(repoTag.registry).toBe("domain.com");
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with registry with port", () => {
      const repoTag = RepoTag.fromString("domain.com:5000/image:latest");

      expect(repoTag.registry).toBe("domain.com:5000");
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with registry without tag", () => {
      const repoTag = RepoTag.fromString("domain.com/image");

      expect(repoTag.registry).toBe("domain.com");
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with nested image", () => {
      const repoTag = RepoTag.fromString("parent/child:latest");

      expect(repoTag.registry).toBe(undefined);
      expect(repoTag.image).toBe("parent/child");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with registry and nested image", () => {
      const repoTag = RepoTag.fromString("domain.com/parent/child:latest");

      expect(repoTag.registry).toBe("domain.com");
      expect(repoTag.image).toBe("parent/child");
      expect(repoTag.tag).toBe("latest");
    });

    it("should work with tag being a hash", () => {
      const repoTag = RepoTag.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

      expect(repoTag.registry).toBe(undefined);
      expect(repoTag.image).toBe("image");
      expect(repoTag.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
    });
  });
});
