const isAutoGeneratedContainerName = (containerName: string) => containerName.includes("testcontainers");

const isUserSpecifiedContainerName = (containerName: string) => containerName.startsWith("/");

export const resolveDockerComposeContainerName = (containerName: string): string => {
  if (isAutoGeneratedContainerName(containerName)) {
    const matches = containerName.match(/^.*testcontainers-[A-Za-z0-9]+_(.+?_[0-9]+)/);
    if (!matches) {
      throw new Error(`Unable to resolve container name for: "${containerName}"`);
    }
    return matches[1];
  } else if (isUserSpecifiedContainerName(containerName)) {
    return containerName.substring(1);
  } else {
    return containerName;
  }
};
