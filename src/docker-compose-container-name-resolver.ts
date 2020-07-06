export const resolveDockerComposeContainerName = (containerName: string): string => {
  const matches = containerName.match(/^.*docker-compose_(.+?_[0-9]+)/);
  if (!matches) {
    throw new Error(`Unable to resolve container name for: "${containerName}"`);
  }
  return matches[1];
};
