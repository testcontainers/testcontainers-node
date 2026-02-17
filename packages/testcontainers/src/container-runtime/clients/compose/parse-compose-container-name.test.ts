import { parseComposeContainerName } from "./parse-compose-container-name";

describe("parseComposeContainerName", () => {
  it("should remove project name label", () => {
    const name = "/project-name-container-1";
    const expected = "container-1";

    expect(parseComposeContainerName("project-name", name)).toBe(expected);
  });

  it("should resolve explicit container name", () => {
    const name = "/custom-container";
    const expected = "custom-container";

    expect(parseComposeContainerName("project-name", name)).toBe(expected);
  });

  it("should throw error if unable to resolve container name", () => {
    expect(() => parseComposeContainerName("project-name", "container-1")).toThrowError(
      `Unable to resolve container name for container name: "container-1", project name: "project-name"`
    );
  });
});
