import { DockerImageName } from "./docker-image-name";
import { REAPER_IMAGE } from "./reaper";
import { SSHD_IMAGE } from "./port-forwarder";

describe("DockerImageName", () => {
  it("should return whether two image names are equal", () => {
    const imageName = new DockerImageName("registry", "image", "tag");

    expect(imageName.equals(new DockerImageName("registry", "image", "tag"))).toBe(true);
    expect(imageName.equals(new DockerImageName("registry", "image", "anotherTag"))).toBe(false);
    expect(imageName.equals(new DockerImageName("registry", "anotherImage", "tag"))).toBe(false);
    expect(imageName.equals(new DockerImageName("anotherRegistry", "image", "tag"))).toBe(false);
  });

  it("should return whether the repo tag is for a Reaper", () => {
    const reaper = DockerImageName.fromString(REAPER_IMAGE);
    const notReaper = new DockerImageName(undefined, "testcontainers/notReaper", "latest");

    expect(reaper.isReaper()).toBe(true);
    expect(notReaper.isReaper()).toBe(false);
  });

  it("should return whether the repo tag is for a helper container", () => {
    const reaper = DockerImageName.fromString(REAPER_IMAGE);
    const portForwarder = DockerImageName.fromString(SSHD_IMAGE);
    const notHelper = new DockerImageName(undefined, "testcontainers/notHelper", "latest");

    expect(reaper.isHelperContainer()).toBe(true);
    expect(portForwarder.isHelperContainer()).toBe(true);
    expect(notHelper.isHelperContainer()).toBe(false);
  });

  describe("toString", () => {
    it("should work with registry", () => {
      const imageName = new DockerImageName("registry", "image", "tag");
      expect(imageName.toString()).toBe("registry/image:tag");
    });

    it("should work without registry", () => {
      const imageName = new DockerImageName(undefined, "image", "tag");
      expect(imageName.toString()).toBe("image:tag");
    });
  });

  describe("fromString", () => {
    it("should work", () => {
      const imageName = DockerImageName.fromString("image:latest");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work without tag", () => {
      const imageName = DockerImageName.fromString("image");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry", () => {
      const imageName = DockerImageName.fromString("domain.com/image:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry with port", () => {
      const imageName = DockerImageName.fromString("domain.com:5000/image:latest");

      expect(imageName.registry).toBe("domain.com:5000");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry without tag", () => {
      const imageName = DockerImageName.fromString("domain.com/image");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with nested image", () => {
      const imageName = DockerImageName.fromString("parent/child:latest");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry and nested image", () => {
      const imageName = DockerImageName.fromString("domain.com/parent/child:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with tag being a hash", () => {
      const imageName = DockerImageName.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
    });
  });
});
