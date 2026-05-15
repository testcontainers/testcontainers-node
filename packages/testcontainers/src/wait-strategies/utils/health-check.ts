import { ContainerInspectInfo, HealthConfig, ImageInspectInfo } from "dockerode";
import { HealthCheck, HealthCheckStatus } from "../../types";

const DISABLED_HEALTH_CHECK_TEST = "NONE";

type HealthCheckConfig = HealthConfig | HealthCheck;
type HealthCheckInspectInfo = ContainerInspectInfo | ImageInspectInfo;
type InspectWithHealthCheckConfig = {
  Config?: {
    Healthcheck?: HealthConfig;
  };
  ContainerConfig?: {
    Healthcheck?: HealthConfig;
  };
  Healthcheck?: HealthConfig;
};
type InspectWithHealthCheckState = {
  State: ContainerInspectInfo["State"] & {
    Healthcheck?: {
      Status?: string;
    };
  };
};

const getHealthCheckTest = (healthCheck: HealthCheckConfig): string[] | undefined => {
  if ("test" in healthCheck) {
    return healthCheck.test;
  }
  return healthCheck.Test;
};

const isDisabledHealthCheck = (test: string[]): boolean => {
  return test[0].toUpperCase() === DISABLED_HEALTH_CHECK_TEST;
};

export const isHealthCheckDisabled = (healthCheck: HealthCheckConfig | undefined): boolean => {
  if (healthCheck === undefined) {
    return false;
  }

  const test = getHealthCheckTest(healthCheck);
  if (test === undefined || test.length === 0) {
    return false;
  }

  return isDisabledHealthCheck(test);
};

export const hasHealthCheck = (healthCheck: HealthCheckConfig | undefined): boolean => {
  if (healthCheck === undefined) {
    return false;
  }

  const test = getHealthCheckTest(healthCheck);
  if (test === undefined || test.length === 0) {
    return false;
  }

  return !isHealthCheckDisabled(healthCheck);
};

export const getHealthCheckConfig = (inspectResult: HealthCheckInspectInfo): HealthConfig | undefined => {
  const inspectWithHealthCheckConfig = inspectResult as InspectWithHealthCheckConfig;

  return (
    inspectWithHealthCheckConfig.Config?.Healthcheck ??
    inspectWithHealthCheckConfig.ContainerConfig?.Healthcheck ??
    inspectWithHealthCheckConfig.Healthcheck
  );
};

export const hasHealthCheckConfig = (inspectResult: HealthCheckInspectInfo): boolean => {
  return hasHealthCheck(getHealthCheckConfig(inspectResult));
};

export const hasDisabledHealthCheckConfig = (inspectResult: HealthCheckInspectInfo): boolean => {
  return isHealthCheckDisabled(getHealthCheckConfig(inspectResult));
};

export const getHealthCheckStatusFromInspect = (inspectResult: ContainerInspectInfo): HealthCheckStatus | undefined => {
  const state = (inspectResult as InspectWithHealthCheckState).State;
  const status = state.Health?.Status ?? state.Healthcheck?.Status;

  return status === undefined || status === "" ? undefined : (status as HealthCheckStatus);
};

export const hasHealthCheckStatus = (inspectResult: ContainerInspectInfo): boolean => {
  return getHealthCheckStatusFromInspect(inspectResult) !== undefined;
};
