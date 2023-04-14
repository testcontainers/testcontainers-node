import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";
import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";

export class CompositeWaitStrategy extends AbstractWaitStrategy {
  private deadline?: number;

  constructor(private readonly waitStrategies: WaitStrategy[]) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    log.debug(`Starting composite wait strategy for ${container.id}`);

    return new Promise((resolve, reject) => {
      let deadlineTimeout: NodeJS.Timeout;
      if (this.deadline !== undefined) {
        deadlineTimeout = setTimeout(() => {
          const message = `Composite wait strategy not successful after ${this.deadline}ms for ${container.id}`;
          log.error(message);
          reject(new Error(message));
        }, this.deadline);
      }

      Promise.all(
        this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime))
      )
        .then(() => resolve())
        .catch((err) => reject(err))
        .finally(() => {
          if (deadlineTimeout) {
            clearTimeout(deadlineTimeout);
          }
        });
    });
  }

  public override withStartupTimeout(startupTimeout: number): this {
    this.waitStrategies
      .filter((waitStrategy) => waitStrategy.getStartupTimeout() === undefined)
      .forEach((waitStrategy) => waitStrategy.withStartupTimeout(startupTimeout));
    return this;
  }

  public withDeadline(deadline: number): this {
    this.deadline = deadline;
    return this;
  }
}
