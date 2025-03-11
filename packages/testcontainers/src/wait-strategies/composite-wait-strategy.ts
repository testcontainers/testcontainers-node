import Dockerode from "dockerode";
import { log } from "../common";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";

export class CompositeWaitStrategy extends AbstractWaitStrategy {
  private deadline?: number;

  constructor(private readonly waitStrategies: WaitStrategy[]) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    log.debug(`Waiting for composite...`, { containerId: container.id });

    return new Promise((resolve, reject) => {
      let deadlineTimeout: NodeJS.Timeout;
      if (this.deadline !== undefined) {
        deadlineTimeout = setTimeout(() => {
          const message = `Composite wait strategy not successful after ${this.deadline}ms`;
          log.error(message, { containerId: container.id });
          reject(new Error(message));
        }, this.deadline);
      }

      Promise.all(
        this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime))
      )
        .then(() => {
          log.debug(`Composite wait strategy complete`, { containerId: container.id });
          resolve();
        })
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
      .filter((waitStrategy) => !waitStrategy.isStartupTimeoutSet())
      .forEach((waitStrategy) => waitStrategy.withStartupTimeout(startupTimeout));
    return this;
  }

  public withDeadline(deadline: number): this {
    this.deadline = deadline;
    return this;
  }
}
