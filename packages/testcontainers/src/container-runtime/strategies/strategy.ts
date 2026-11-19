import type { ContainerRuntimeClientStrategyNotApplicable, ContainerRuntimeClientStrategyResult } from "./types";

export interface ContainerRuntimeClientStrategy {
  getName(): string;
  getResult(): Promise<ContainerRuntimeClientStrategyResult | ContainerRuntimeClientStrategyNotApplicable>;
}
