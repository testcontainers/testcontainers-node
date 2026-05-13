import { HealthConfig } from "dockerode";
import { HealthCheck } from "../../types";

const DISABLED_HEALTH_CHECK_TEST = "NONE";

type HealthCheckConfig = HealthConfig | HealthCheck;

const getHealthCheckTest = (healthCheck: HealthCheckConfig): string[] | undefined => {
  if ("test" in healthCheck) {
    return healthCheck.test;
  }
  return healthCheck.Test;
};

const isDisabledHealthCheck = (test: string[]): boolean => {
  return test[0].toUpperCase() === DISABLED_HEALTH_CHECK_TEST;
};

export const hasHealthCheck = (healthCheck: HealthCheckConfig | undefined): boolean => {
  if (healthCheck === undefined) {
    return false;
  }

  const test = getHealthCheckTest(healthCheck);
  if (test === undefined || test.length === 0) {
    return false;
  }

  return !isDisabledHealthCheck(test);
};
