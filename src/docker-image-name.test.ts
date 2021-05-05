import { DockerImageName } from "./docker-image-name";
import { ReaperInstance } from "./reaper";
import { PortForwarderInstance } from "./port-forwarder";

describe("DockerImageName", () => {
  it("should return whether two image names are equal", () => {
    const dockerImageName = new DockerImageName("registry", "image", "tag");

    expect(dockerImageName.equals(new DockerImageName("registry", "image", "tag"))).toBe(true);
    expect(dockerImageName.equals(new DockerImageName("registry", "image", "anotherTag"))).toBe(false);
    expect(dockerImageName.equals(new DockerImageName("registry", "anotherImage", "tag"))).toBe(false);
    expect(dockerImageName.equals(new DockerImageName("anotherRegistry", "image", "tag"))).toBe(false);
  });

  it("should return whether the repo tag is for a Reaper", () => {
    const reaper = DockerImageName.fromString(ReaperInstance.getImage());
    const notReaper = new DockerImageName(undefined, "testcontainers/notReaper", "latest");

    expect(reaper.isReaper()).toBe(true);
    expect(notReaper.isReaper()).toBe(false);
  });

  it("should return whether the repo tag is for a helper container", () => {
    const reaper = DockerImageName.fromString(ReaperInstance.getImage());
    const portForwarder = DockerImageName.fromString(PortForwarderInstance.getImage());
    const notHelper = new DockerImageName(undefined, "testcontainers/notHelper", "latest");

    expect(reaper.isHelperContainer()).toBe(true);
    expect(portForwarder.isHelperContainer()).toBe(true);
    expect(notHelper.isHelperContainer()).toBe(false);
  });

  describe("toString", () => {
    it("should work with registry", () => {
      const dockerImageName = new DockerImageName("registry", "image", "tag");
      expect(dockerImageName.toString()).toBe("registry/image:tag");
    });

    it("should work without registry", () => {
      const dockerImageName = new DockerImageName(undefined, "image", "tag");
      expect(dockerImageName.toString()).toBe("image:tag");
    });
  });

  describe("fromString", () => {
    it("should work", () => {
      const dockerImageName = DockerImageName.fromString("image:latest");

      expect(dockerImageName.registry).toBeUndefined();
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work without tag", () => {
      const dockerImageName = DockerImageName.fromString("image");

      expect(dockerImageName.registry).toBeUndefined();
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with registry", () => {
      const dockerImageName = DockerImageName.fromString("domain.com/image:latest");

      expect(dockerImageName.registry).toBe("domain.com");
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with registry with port", () => {
      const dockerImageName = DockerImageName.fromString("domain.com:5000/image:latest");

      expect(dockerImageName.registry).toBe("domain.com:5000");
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with registry without tag", () => {
      const dockerImageName = DockerImageName.fromString("domain.com/image");

      expect(dockerImageName.registry).toBe("domain.com");
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with nested image", () => {
      const dockerImageName = DockerImageName.fromString("parent/child:latest");

      expect(dockerImageName.registry).toBe(undefined);
      expect(dockerImageName.image).toBe("parent/child");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with registry and nested image", () => {
      const dockerImageName = DockerImageName.fromString("domain.com/parent/child:latest");

      expect(dockerImageName.registry).toBe("domain.com");
      expect(dockerImageName.image).toBe("parent/child");
      expect(dockerImageName.tag).toBe("latest");
    });

    it("should work with tag being a hash", () => {
      const dockerImageName = DockerImageName.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

      expect(dockerImageName.registry).toBe(undefined);
      expect(dockerImageName.image).toBe("image");
      expect(dockerImageName.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
    });
  });
});
