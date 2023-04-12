import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";

export class CompositeWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly waitStrategies: WaitStrategy[]) {
    super();
    this.withStartupTimeout(this.getMaxStartupTimeout());
  }

  private getMaxStartupTimeout(): number {
    return Math.max(...this.waitStrategies.map((waitStrategy) => waitStrategy.getStartupTimeout()));
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    await Promise.all(
      this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime))
    );
  }
}
