import { log } from "../common";

export class ImageName {
  public readonly string: string;

  private static readonly hexRE = /^[0-9a-f]{64}$/i;

  constructor(
    public readonly registry: string | undefined,
    public readonly image: string,
    public readonly tag: string
  ) {
    if (!this.registry && process.env.TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX) {
      this.registry = process.env.TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX.replace(/\/$/, "");
      log.info(`Applying changes to image ${image} with tag ${tag}: added registry ${this.registry}`);
    }
    if (this.registry) {
      if (this.tag.startsWith("sha256:")) {
        this.string = `${this.registry}/${this.image}@${this.tag}`;
      } else {
        this.string = `${this.registry}/${this.image}:${this.tag}`;
      }
    } else if (this.tag === "latest" && ImageName.hexRE.test(this.image)) {
      // 64 byte hex string. This refers to an image sha256 directly.
      // Do not put the tag as the docker does not accept it.
      // It will fail with:
      //
      //    invalid repository name (<image>), cannot specify 64-byte hexadecimal strings.
      //
      this.string = this.image;
    } else if (this.tag.startsWith("sha256:")) {
      this.string = `${this.image}@${this.tag}`;
    } else {
      this.string = `${this.image}:${this.tag}`;
    }
  }

  public equals(other: ImageName): boolean {
    return this.registry === other.registry && this.image === other.image && this.tag === other.tag;
  }

  public static fromString(string: string): ImageName {
    const registry = this.getRegistry(string);
    const stringWithoutRegistry = registry ? string.split("/").slice(1).join("/") : string;

    if (stringWithoutRegistry.includes("@")) {
      const [image, tag] = stringWithoutRegistry.split("@");
      return new ImageName(registry, image, tag);
    } else if (stringWithoutRegistry.includes(":")) {
      const [image, tag] = stringWithoutRegistry.split(":");
      return new ImageName(registry, image, tag);
    } else {
      return new ImageName(registry, stringWithoutRegistry, "latest");
    }
  }

  private static getRegistry(string: string): string | undefined {
    const parts = string.split("/");

    if (parts.length > 1 && this.isRegistry(parts[0])) {
      return parts[0];
    }
  }

  private static isRegistry(string: string): boolean {
    return string.includes(".") || string.includes(":") || string === "localhost";
  }
}
