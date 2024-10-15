import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports.ts";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeout: number): WaitStrategy;

  isStartupTimeoutSet(): boolean;

  getStartupTimeout(): number;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = 60_000;
  private startupTimeoutSet = false;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeout: number): this {
    this.startupTimeout = startupTimeout;
    this.startupTimeoutSet = true;
    return this;
  }

  public isStartupTimeoutSet(): boolean {
    return this.startupTimeoutSet;
  }

  public getStartupTimeout(): number {
    return this.startupTimeout;
  }
}
