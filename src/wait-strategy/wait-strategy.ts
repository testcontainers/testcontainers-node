import { BoundPorts } from "../bound-ports";
import Dockerode from "dockerode";

export interface WaitStrategy {
  waitUntilReady(container: Dockerode.Container, host: string, boundPorts: BoundPorts, startTime?: Date): Promise<void>;

  withStartupTimeout(startupTimeout: number): WaitStrategy;
}

export abstract class AbstractWaitStrategy implements WaitStrategy {
  protected startupTimeout = 60_000;

  public abstract waitUntilReady(
    container: Dockerode.Container,
    host: string,
    boundPorts: BoundPorts,
    startTime?: Date
  ): Promise<void>;

  public withStartupTimeout(startupTimeout: number): WaitStrategy {
    this.startupTimeout = startupTimeout;
    return this;
  }
}
