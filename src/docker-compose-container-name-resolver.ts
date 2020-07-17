export const resolveDockerComposeContainerName = (containerName: string): string => {
  if (containerName.includes("docker-compose_")) {
    const matches = containerName.match(/^.*docker-compose_(.+?_[0-9]+)/);
    if (!matches) {
      throw new Error(`Unable to resolve container name for: "${containerName}"`);
    }
    return matches[1];
  } else if (containerName.startsWith("/")) {
    return containerName.substring(1);
  } else {
    return containerName;
  }
};
