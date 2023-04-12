import { BoundPorts } from "../bound-ports";
import Dockerode from "dockerode";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeout: number): WaitStrategy;

  getStartupTimeout(): number;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = 60_000;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeout: number): this {
    this.startupTimeout = startupTimeout;
    return this;
  }

  public getStartupTimeout(): number {
    return this.startupTimeout;
  }
}
