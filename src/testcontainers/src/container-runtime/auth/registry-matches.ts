export const registryMatches = (authConfigRegistry: string, requestedRegistry: string): boolean =>
  authConfigRegistry == requestedRegistry || authConfigRegistry.endsWith("://" + requestedRegistry);
