import { resolveDockerComposeContainerName } from "./docker-compose-container-name-resolver";

describe("resolveDockerComposeContainerName", () => {
  it("should remove leading slash", () => {
    const name = "/custom-container";
    const expected = "custom-container";

    expect(resolveDockerComposeContainerName(name)).toBe(expected);
  });

  describe('from generated', () => {
    it("should remove docker-compose label", () => {
      const name = "docker-compose_container_1";
      const expected = "container_1";

      expect(resolveDockerComposeContainerName(name)).toBe(expected);
    });

    it("should remove prefix", () => {
      const name = "123_docker-compose_container_1";
      const expected = "container_1";

      expect(resolveDockerComposeContainerName(name)).toBe(expected);
    });

    it("should remove suffix", () => {
      const name = "docker-compose_container_1_123";
      const expected = "container_1";

      expect(resolveDockerComposeContainerName(name)).toBe(expected);
    });

    it("should throw error if unable to resolve container name", () => {
      expect(() => resolveDockerComposeContainerName("docker-compose_")).toThrowError(
          `Unable to resolve container name for: "docker-compose_"`
      );
    });
  })
});
