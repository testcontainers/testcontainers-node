import path from "path";
import { getDockerfileImages } from "./dockerfile-parser";
import { DockerImageName } from "./docker-image-name";

const dockerfileParserFixtures = path.resolve(__dirname, "..", "fixtures", "docker", "dockerfile-parser");

describe("DockerfileParser", () => {
  it("should return image name", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([DockerImageName.fromString("node:10-alpine")]);
  });

  it("should return multiple images for multi-stage build", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([DockerImageName.fromString("node:latest"), DockerImageName.fromString("alpine:latest")]);
  });

  it("should work when formatted with spaces", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "formatted.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([DockerImageName.fromString("node:latest")]);
  });

  it("should return unique images for multi-stage build", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage-duplicate.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([DockerImageName.fromString("node:latest")]);
  });

  it("should return images for multi-stage build with named stages", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage-naming.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([DockerImageName.fromString("node:latest"), DockerImageName.fromString("alpine:latest")]);
  });

  it("should return images with build args", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "buildargs.Dockerfile");
    const images = await getDockerfileImages(dockerfile, { repositoryName: "cristianrgreco", repositoryPort: "5000" });
    expect(images).toEqual([DockerImageName.fromString("cristianrgreco:5000/testcontainer-private:1.1.12")]);
  });
});
