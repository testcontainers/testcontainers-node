import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { log } from "../logger";
import { containerLogs } from "../docker/functions/container/container-logs";
import byline from "byline";
import { AbstractWaitStrategy } from "./wait-strategy";

export type Log = string;

export class LogWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly message: Log | RegExp, private readonly times: number) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void> {
    log.debug(`Waiting for log message "${this.message}" for ${container.id}`);

    const stream = await containerLogs(container, { since: startTime });

    return new Promise((resolve, reject) => {
      const startupTimeout = this.startupTimeout;
      const timeout = setTimeout(() => {
        const message = `Log message "${this.message}" not received after ${startupTimeout}ms for ${container.id}`;
        log.error(message);
        reject(new Error(message));
      }, startupTimeout);

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
          reject(new Error(`Log stream ended and message "${this.message}" was not received for ${container.id}`));
        });
    });
  }
}
