import { DockerConfig } from "./types";

import fs from "fs";
import { readDockerConfig } from "./config";

const spyExists = jest.spyOn(fs, "existsSync");
const spyRead = jest.spyOn(fs.promises, "readFile");

describe("Config", () => {
  const dockerConfig: DockerConfig = {
    auths: {
      "https://registry.example.com": {
        email: "user@example.com",
        username: "user",
        password: "pass",
      },
    },
  };

  afterEach(() => (process.env.DOCKER_AUTH_CONFIG = undefined));

  it("should return empty object if neither config nor environment variable exists", async () => {
    spyExists.mockReturnValueOnce(false);

    const config = await readDockerConfig();
    expect(config).toEqual({});
  });

  it("should use the docker environment variable if it exists", async () => {
    process.env.DOCKER_AUTH_CONFIG = JSON.stringify(dockerConfig);

    spyExists.mockReturnValueOnce(false);

    const config = await readDockerConfig();
    expect(config).toEqual(dockerConfig);
  });

  it("should use the docker config file if it exists", async () => {
    spyExists.mockReturnValueOnce(true);
    spyRead.mockResolvedValueOnce(JSON.stringify(dockerConfig));

    const config = await readDockerConfig();
    expect(config).toEqual(dockerConfig);
  });

  it("should prioritize the docker config file over environment variable", async () => {
    spyExists.mockReturnValueOnce(true);
    spyRead.mockResolvedValueOnce(JSON.stringify(dockerConfig));

    const envDockerConfig: DockerConfig = {};
    process.env.DOCKER_AUTH_CONFIG = JSON.stringify(envDockerConfig);

    const config = await readDockerConfig();
    expect(config).toEqual(dockerConfig);
    expect(config).not.toEqual(envDockerConfig);
  });
});
