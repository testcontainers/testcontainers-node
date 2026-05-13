export function parseComposeContainerName(projectName: string, containerName: string): string {
  if (containerName.startsWith(`/${projectName}-`)) {
    return containerName.substring(`/${projectName}-`.length);
  } else if (containerName.startsWith("/")) {
    return containerName.substring(1);
  } else {
    throw new Error(
      `Unable to resolve container name for container name: "${containerName}", project name: "${projectName}"`
    );
  }
}
