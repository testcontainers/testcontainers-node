import { resolveDockerComposeContainerName } from "./docker-compose-container-name-resolver";

describe("resolveDockerComposeContainerName", () => {
  it("should remove project name label", () => {
    const name = "/project-name_container_1";
    const expected = "container_1";

    expect(resolveDockerComposeContainerName("project-name", name)).toBe(expected);
  });

  it("should resolve explicit container name", () => {
    const name = "/custom-container";
    const expected = "custom-container";

    expect(resolveDockerComposeContainerName("project-name", name)).toBe(expected);
  });

  it("should throw error if unable to resolve container name", () => {
    expect(() => resolveDockerComposeContainerName("project-name", "container_1")).toThrowError(
      `Unable to resolve container name for container name: "container_1", project name: "project-name"`
    );
  });
});
