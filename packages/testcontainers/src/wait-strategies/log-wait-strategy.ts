import byline from "byline";
import Dockerode from "dockerode";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  constructor(
    private readonly message: Log | RegExp,
    private readonly times: number
  ) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    log.debug(`Waiting for log message "${this.message}"...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();
    const stream = await client.container.logs(container, { since: startTime ? startTime.getTime() / 1000 : 0 });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const message = `Log message "${this.message}" not received after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        reject(new Error(message));
      }, this.startupTimeout);

      const comparisonFn: (line: string) => boolean = (line: string) => {
        if (this.message instanceof RegExp) {
          return this.message.test(line);
        } else {
          return line.includes(this.message);
        }
      };

      let count = 0;
      const lineProcessor = (line: string) => {
        if (comparisonFn(line)) {
          if (++count === this.times) {
            stream.destroy();
            clearTimeout(timeout);
            log.debug(`Log wait strategy complete`, { containerId: container.id });
            resolve();
          }
        }
      };

      byline(stream)
        .on("data", lineProcessor)
        .on("err", lineProcessor)
        .on("end", () => {
          stream.destroy();
          clearTimeout(timeout);
          const message = `Log stream ended and message "${this.message}" was not received`;
          log.error(message, { containerId: container.id });
          reject(new Error(message));
        });
    });
  }
}
