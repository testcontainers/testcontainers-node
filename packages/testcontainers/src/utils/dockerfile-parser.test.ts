import path from "node:path";
import { ImageName } from "../container-runtime";
import { getDockerfileImages } from "./dockerfile-parser";

const dockerfileParserFixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker", "dockerfile-parser");

describe("DockerfileParser", () => {
  it("should return image name", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("node:10-alpine")]);
  });

  it("should return multiple images for multi-stage build", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("node:latest"), ImageName.fromString("alpine:latest")]);
  });

  it("should work when formatted with spaces", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "formatted.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("node:latest")]);
  });

  it("should return unique images for multi-stage build", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage-duplicate.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("node:latest")]);
  });

  it("should return images for multi-stage build with named stages", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "multistage-naming.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("node:latest"), ImageName.fromString("alpine:latest")]);
  });

  it("should return images with build args", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "buildargs.Dockerfile");
    const images = await getDockerfileImages(dockerfile, { repositoryName: "cristianrgreco", repositoryPort: "5000" });
    expect(images).toEqual([ImageName.fromString("cristianrgreco:5000/testcontainer-private:1.1.12")]);
  });

  it("should skip flags such as --platform", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "platform.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("myreg.example.com/team/base:1.2")]);
  });

  it("should work when separated with tabs", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "tabs.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("ghcr.io/org/app:2")]);
  });

  it("should work with line continuations", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "line-continuation.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("ghcr.io/org/app:2"), ImageName.fromString("private.io/x/y:3")]);
  });

  it("should use the escape character from the escape parser directive", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "escape.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("private.io/sdk:1"), ImageName.fromString("private.io/runtime:1")]);
  });

  it("should use ARG defaults declared before FROM", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "arg-default.Dockerfile");
    const images = await getDockerfileImages(dockerfile, {});
    expect(images).toEqual([ImageName.fromString("private.io/x/y:3")]);
  });

  it("should prefer build args over ARG defaults", async () => {
    const dockerfile = path.resolve(dockerfileParserFixtures, "arg-default.Dockerfile");
    const images = await getDockerfileImages(dockerfile, { BASE: "ghcr.io/org/app:2" });
    expect(images).toEqual([ImageName.fromString("ghcr.io/org/app:2")]);
  });
});
