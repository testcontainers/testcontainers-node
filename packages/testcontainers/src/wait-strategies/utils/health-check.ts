import { HealthConfig } from "dockerode";
import { HealthCheck } from "../../types";

const DISABLED_HEALTH_CHECK_TEST = "NONE";

export const hasHealthCheck = (healthCheck: HealthConfig | HealthCheck | undefined): boolean => {
  const test = healthCheck === undefined ? undefined : "test" in healthCheck ? healthCheck.test : healthCheck.Test;
  return test !== undefined && test.length > 0 && test[0].toUpperCase() !== DISABLED_HEALTH_CHECK_TEST;
};
