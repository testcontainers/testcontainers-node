export const resolveDockerComposeContainerName = (projectName: string, containerName: string): string => {
  if (containerName.includes(projectName)) {
    return containerName.substring(`/${projectName}_`.length);
  } else if (containerName.startsWith("/")) {
    return containerName.substring(1);
  } else {
    throw new Error(
      `Unable to resolve container name for container name: "${containerName}", project name: "${projectName}"`
    );
  }
};
