import path from "path";
import { getDockerfileImages } from "./dockerfile-parser";
import { DockerImageName } from "./docker-image-name";

describe("DockerfileParser", () => {
  it("should return image name", async () => {
    const dockerfile = path.resolve(__dirname, "..", "fixtures", "docker", "dockerfile-parser", "Dockerfile");

    const images = await getDockerfileImages(dockerfile);

    expect(images).toEqual([DockerImageName.fromString("node:10-alpine")]);
  });

  it("should return multiple images for multi-stage build", async () => {
    const dockerfile = path.resolve(
      __dirname,
      "..",
      "fixtures",
      "docker",
      "dockerfile-parser",
      "multistage.Dockerfile"
    );

    const images = await getDockerfileImages(dockerfile);

    expect(images).toEqual([DockerImageName.fromString("node:latest"), DockerImageName.fromString("alpine:latest")]);
  });

  it("should work when formatted with spaces", async () => {
    const dockerfile = path.resolve(__dirname, "..", "fixtures", "docker", "dockerfile-parser", "formatted.Dockerfile");

    const images = await getDockerfileImages(dockerfile);

    expect(images).toEqual([DockerImageName.fromString("node:latest")]);
  });

  it("should return unique images for multi-stage build", async () => {
    const dockerfile = path.resolve(
      __dirname,
      "..",
      "fixtures",
      "docker",
      "dockerfile-parser",
      "multistage-duplicate.Dockerfile"
    );

    const images = await getDockerfileImages(dockerfile);

    expect(images).toEqual([DockerImageName.fromString("node:latest")]);
  });
});
