import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";

export class CompositeWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly waitStrategies: WaitStrategy[]) {
    super();
    this.withStartupTimeout(Math.max(...this.waitStrategies.map((waitStrategy) => waitStrategy.getStartupTimeout())));
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    log.debug(`Starting composite wait strategy for ${container.id}`);

    return new Promise((resolve, reject) => {
      const onTimeout = () => {
        const message = `Composite wait strategy not resolved after ${this.startupTimeout}ms for ${container.id}`;
        log.error(message);
        reject(new Error(message));
      };

      const timeout = setTimeout(onTimeout, this.startupTimeout);

      Promise.all(
        this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime))
      )
        .then(() => resolve())
        .catch((err) => reject(err))
        .finally(() => clearTimeout(timeout));
    });
  }

  public override withStartupTimeout(startupTimeout: number): this {
    super.withStartupTimeout(startupTimeout);
    this.waitStrategies.forEach((waitStrategy) => waitStrategy.withStartupTimeout(startupTimeout));
    return this;
  }
}
