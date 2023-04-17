import { BoundPorts } from "../bound-ports";
import Dockerode from "dockerode";

export const DEFAULT_STARTUP_TIMEOUT = 60_000;

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeout: number): WaitStrategy;

  getStartupTimeout(): number | undefined;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout?: number;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeout: number): this {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public getStartupTimeout(): number | undefined {
    return this.startupTimeout;
  }
}
