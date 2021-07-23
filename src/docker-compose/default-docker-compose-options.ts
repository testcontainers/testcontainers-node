import * as dockerCompose from "docker-compose";

export const defaultDockerComposeOptions = (
  filePath: string,
  files: string | string[],
  projectName: string
): Partial<dockerCompose.IDockerComposeOptions> => ({
  log: false,
  cwd: filePath,
  config: files,
  env: {
    ...process.env,
    COMPOSE_PROJECT_NAME: projectName,
  },
});
