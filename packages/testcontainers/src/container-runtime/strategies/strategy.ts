import { ContainerRuntimeClientStrategyResult } from "./types.ts";

export interface ContainerRuntimeClientStrategy {
  getName(): string;
  getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined>;
}
