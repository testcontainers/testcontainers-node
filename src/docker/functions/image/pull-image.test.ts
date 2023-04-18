import Dockerode from "dockerode";
import { pullImage } from "./pull-image";
import { DockerImageName } from "../../../docker-image-name";
import { Readable } from "stream";
import { AuthConfig } from "../../types";

const mockDockerodePull = jest.fn();
jest.mock(
  "dockerode",
  () =>
    function () {
      return {
        pull: (...args: unknown[]) => {
          const stream = new Readable();
          stream.push(null);
          mockDockerodePull.mockResolvedValueOnce(stream);
          return mockDockerodePull(...args);
        },
      };
    }
);

const mockImageExists = jest.fn();
jest.mock("./image-exists", () => ({
  imageExists: () => mockImageExists(),
}));

const mockGetAuthConfig = jest.fn();
jest.mock("../../../registry-auth-locator/get-auth-config", () => ({
  getAuthConfig: () => mockGetAuthConfig(),
}));

const dockerode = new Dockerode();
const indexServerAddress = "index.docker.io";

test("should not pull image when it already exists", async () => {
  mockImageExists.mockResolvedValueOnce(true);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test"),
  };
  await pullImage(dockerode, indexServerAddress, options);

  expect(mockDockerodePull).not.toHaveBeenCalled();
});

test("should pull image when it does not exist", async () => {
  mockImageExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test:latest"),
  };
  await pullImage(dockerode, indexServerAddress, options);

  expect(mockDockerodePull).toHaveBeenCalledWith("test:latest", { authconfig: undefined });
});

test("should pull image when it exists but force set to true", async () => {
  mockImageExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);

  const options = {
    force: true,
    imageName: DockerImageName.fromString("test:latest"),
  };
  await pullImage(dockerode, indexServerAddress, options);

  expect(mockDockerodePull).toHaveBeenCalledWith("test:latest", { authconfig: undefined });
});

test("should pull image with auth config when auth config exists", async () => {
  mockImageExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const authConfig: AuthConfig = { registryAddress: indexServerAddress, username: "test", password: "test" };
  mockGetAuthConfig.mockResolvedValueOnce(authConfig);

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test:latest"),
  };
  await pullImage(dockerode, indexServerAddress, options);

  expect(mockDockerodePull).toHaveBeenCalledWith("test:latest", { authconfig: authConfig });
});

test("should retry pulling an image when image fails to pull during stream", async () => {
  mockImageExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test:latest"),
  };
  await pullImage(dockerode, indexServerAddress, options);

  expect(mockDockerodePull).toHaveBeenCalledTimes(2);
});

test("should retry pulling an image when image fails to pull during stream a maximum of two times", async () => {
  mockImageExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test:latest"),
  };

  await expect(() => pullImage(dockerode, indexServerAddress, options)).rejects.toThrowError("Failed to pull image");
  expect(mockDockerodePull).toHaveBeenCalledTimes(2);
});

test("should not retry pulling an image when image fails to pull for other reason", async () => {
  mockImageExists.mockResolvedValueOnce(false);
  mockGetAuthConfig.mockResolvedValueOnce(undefined);
  mockDockerodePull.mockRejectedValueOnce(new Error("ERROR"));

  const options = {
    force: false,
    imageName: DockerImageName.fromString("test:latest"),
  };

  await expect(() => pullImage(dockerode, indexServerAddress, options)).rejects.toThrowError("ERROR");
  expect(mockDockerodePull).toHaveBeenCalledTimes(1);
});
