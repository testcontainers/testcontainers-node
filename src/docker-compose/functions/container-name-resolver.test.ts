import { resolveContainerName } from "./container-name-resolver";

jest.mock("../../docker/session-id", () => ({ sessionId: "session-id" }));

describe("resolveContainerName", () => {
  it("should remove session ID", () => {
    const name = "/session-id_container_1";
    const expected = "container_1";

    expect(resolveContainerName(name)).toBe(expected);
  });

  it("should resolve explicit container name", () => {
    const name = "/custom-container";
    const expected = "custom-container";

    expect(resolveContainerName(name)).toBe(expected);
  });

  it("should throw error if unable to resolve container name", () => {
    expect(() => resolveContainerName("container_1")).toThrowError(
      `Unable to resolve container name for container name: "container_1", session ID: "session-id"`
    );
  });
});
