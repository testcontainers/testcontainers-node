import { ImageName } from "./image-name";

describe("ContainerImage", () => {
  it("should return whether two image names are equal", () => {
    const imageName = new ImageName("registry", "image", "tag");

    expect(imageName.equals(new ImageName("registry", "image", "tag"))).toBe(true);
    expect(imageName.equals(new ImageName("registry", "image", "anotherTag"))).toBe(false);
    expect(imageName.equals(new ImageName("registry", "anotherImage", "tag"))).toBe(false);
    expect(imageName.equals(new ImageName("anotherRegistry", "image", "tag"))).toBe(false);
  });

  describe("string", () => {
    it("should work with registry", () => {
      const imageName = new ImageName("registry", "image", "tag");
      expect(imageName.string).toBe("registry/image:tag");
    });

    it("should work without registry", () => {
      const imageName = new ImageName(undefined, "image", "tag");
      expect(imageName.string).toBe("image:tag");
    });

    it("should work with tag being a hash", () => {
      const imageName = new ImageName(undefined, "image", "sha256:1234abcd1234abcd1234abcd1234abcd");
      expect(imageName.string).toBe("image@sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should work with registry and tag being a hash", () => {
      const imageName = new ImageName("registry", "image", "sha256:1234abcd1234abcd1234abcd1234abcd");
      expect(imageName.string).toBe("registry/image@sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should not append the `latest` tag to image IDs", () => {
      const imageName = new ImageName(
        undefined,
        "aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f",
        "latest"
      );
      expect(imageName.string).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");
    });

    it("should keep other tags (not `latest`) on image IDs", () => {
      // Note that the resulting image ID will not be accepted by docker.
      // However, not treating tags other than `latests` specially is probably less surprising.
      const imageName = new ImageName(
        undefined,
        "aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f",
        "1"
      );
      expect(imageName.string).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f:1");
    });
  });

  describe("fromString", () => {
    it("should work", () => {
      const imageName = ImageName.fromString("image:latest");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work without tag", () => {
      const imageName = ImageName.fromString("image");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry", () => {
      const imageName = ImageName.fromString("domain.com/image:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry with port", () => {
      const imageName = ImageName.fromString("domain.com:5000/image:latest");

      expect(imageName.registry).toBe("domain.com:5000");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry without tag", () => {
      const imageName = ImageName.fromString("domain.com/image");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with nested image", () => {
      const imageName = ImageName.fromString("parent/child:latest");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry and nested image", () => {
      const imageName = ImageName.fromString("domain.com/parent/child:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with tag being a hash", () => {
      const imageName = ImageName.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should work with image being an image ID", () => {
      const imageName = ImageName.fromString("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");
      expect(imageName.tag).toBe("latest");
    });
  });
});
