import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";

export class CompositeWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly waitStrategies: WaitStrategy[]) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    await Promise.all(
      this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime))
    );
  }
}
