import { ContainerInspectInfo } from "dockerode";
import { log } from "../../common";
import { ContainerRuntimeClient, ImageName } from "../../container-runtime";
import { HealthCheck } from "../../types";
import { Wait } from "../wait";
import { WaitStrategy } from "../wait-strategy";
import {
  hasDisabledHealthCheckConfig,
  hasHealthCheck,
  hasHealthCheckConfig,
  hasHealthCheckStatus,
} from "./health-check";

type WaitStrategySelectorOptions = {
  client: ContainerRuntimeClient;
  inspectResult: ContainerInspectInfo;
  waitStrategy?: WaitStrategy;
  healthCheck?: HealthCheck;
  imageNames?: string[];
};

export const selectWaitStrategy = async ({
  client,
  inspectResult,
  waitStrategy,
  healthCheck,
  imageNames = getImageNames(inspectResult),
}: WaitStrategySelectorOptions): Promise<WaitStrategy> => {
  if (waitStrategy) return waitStrategy;
  if (hasHealthCheck(healthCheck)) return Wait.forHealthCheck();
  if (hasDisabledHealthCheckConfig(inspectResult)) return Wait.forListeningPorts();
  if (hasHealthCheckConfig(inspectResult) || hasHealthCheckStatus(inspectResult)) return Wait.forHealthCheck();
  if (await imageHasHealthCheck(client, imageNames)) return Wait.forHealthCheck();
  return Wait.forListeningPorts();
};

const getImageNames = (inspectResult: ContainerInspectInfo): string[] => {
  return Array.from(
    new Set(
      [inspectResult.Config.Image, inspectResult.Image].filter(
        (imageName): imageName is string => imageName !== undefined && imageName !== ""
      )
    )
  );
};

const imageHasHealthCheck = async (client: ContainerRuntimeClient, imageNames: string[]): Promise<boolean> => {
  for (const imageName of imageNames) {
    try {
      if (hasHealthCheckConfig(await client.image.inspect(ImageName.fromString(imageName)))) {
        return true;
      }
    } catch (err) {
      log.warn(`Failed to inspect image "${imageName}" for health check config: ${err}`);
    }
  }

  return false;
};
