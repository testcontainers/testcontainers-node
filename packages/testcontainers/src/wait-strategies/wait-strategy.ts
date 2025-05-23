import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeoutMs: number): WaitStrategy;

  isStartupTimeoutSet(): boolean;

  getStartupTimeout(): number;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeoutMs = 60_000;
  private startupTimeoutSet = false;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeoutMs: number): this {
    this.startupTimeoutMs = startupTimeoutMs;
    this.startupTimeoutSet = true;
    return this;
  }

  public isStartupTimeoutSet(): boolean {
    return this.startupTimeoutSet;
  }

  public getStartupTimeout(): number {
    return this.startupTimeoutMs;
  }
}
