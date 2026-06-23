import Dockerode from "dockerode";
import { Agent, request } from "undici";
import { IntervalRetry, log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { BoundPorts } from "../utils/bound-ports";
import { undiciResponseToFetchResponse } from "./utils/undici-response-parser";
import { AbstractWaitStrategy } from "./wait-strategy";

export interface HttpWaitStrategyOptions {
  abortOnContainerExit?: boolean;
}

export class HttpWaitStrategy extends AbstractWaitStrategy {
  private protocol = "http";
  private method = "GET";
  private headers: { [key: string]: string } = {};
  private readonly predicates: Array<(response: Response) => Promise<boolean>> = [];
  private _allowInsecure = false;
  private readTimeoutMs = 1000;

  constructor(
    private readonly path: string,
    private readonly port: number,
    private readonly options: HttpWaitStrategyOptions
  ) {
    super();
  }

  public forStatusCode(statusCode: number): this {
    this.predicates.push(async (response: Response) => response.status === statusCode);
    return this;
  }

  public forStatusCodeMatching(predicate: (statusCode: number) => boolean): this {
    this.predicates.push(async (response: Response) => predicate(response.status));
    return this;
  }

  public forResponsePredicate(predicate: (response: string) => boolean): this {
    this.predicates.push(async (response: Response) => predicate(await response.text()));
    return this;
  }

  public withMethod(method: string): this {
    this.method = method;
    return this;
  }

  public withHeaders(headers: { [key: string]: string }): this {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  public withBasicCredentials(username: string, password: string): this {
    const base64Encoded = Buffer.from(`${username}:${password}`).toString("base64");
    this.headers = { ...this.headers, Authorization: `Basic ${base64Encoded}` };
    return this;
  }

  public withReadTimeout(readTimeoutMs: number): this {
    this.readTimeoutMs = readTimeoutMs;
    return this;
  }

  public usingTls(): this {
    this.protocol = "https";
    return this;
  }

  public allowInsecure(): this {
    this._allowInsecure = true;
    return this;
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    log.debug(`Waiting for HTTP...`, { containerId: container.id });

    const exitStatus = "exited";
    let containerExited = false;
    const client = await getContainerRuntimeClient();
    const { abortOnContainerExit } = this.options;
    // Scope the insecure agent to this invocation rather than the strategy instance: a single
    // strategy object can drive multiple concurrent waits (e.g. a compose default wait strategy
    // passed to every service), and a shared dispatcher would let one finished wait destroy the
    // agent another wait is still using.
    const agent = this.createInsecureAgent();

    try {
      await new IntervalRetry<Response | undefined, Error>(this.readTimeoutMs).retryUntil(
        async () => {
          try {
            const url = `${this.protocol}://${client.info.containerRuntime.host}:${boundPorts.getBinding(this.port)}${
              this.path
            }`;

            if (abortOnContainerExit) {
              const containerStatus = (await client.container.inspect(container)).State.Status;

              if (containerStatus === exitStatus) {
                containerExited = true;
                return;
              }
            }

            return undiciResponseToFetchResponse(
              await request(url, {
                method: this.method,
                signal: AbortSignal.timeout(this.readTimeoutMs),
                headers: this.headers,
                dispatcher: agent,
              })
            );
          } catch {
            return undefined;
          }
        },
        async (response) => {
          if (abortOnContainerExit && containerExited) {
            return true;
          }

          if (response === undefined) {
            return false;
          } else if (!this.predicates.length) {
            return response.ok;
          } else {
            for (const predicate of this.predicates) {
              const result = await predicate(response);
              if (!result) {
                return false;
              }
            }
            return true;
          }
        },
        () => {
          const message = `URL ${this.path} not accessible after ${this.startupTimeoutMs}ms`;
          log.error(message, { containerId: container.id });
          throw new Error(message);
        },
        this.startupTimeoutMs
      );
    } finally {
      // Force-close rather than graceful close(): status-only predicates never consume the
      // response body, so close() could hang waiting for those connections to be released.
      // The wait has finished by this point, so there is nothing left worth draining.
      await agent?.destroy();
    }

    if (abortOnContainerExit && containerExited) {
      return this.handleContainerExit(container);
    }

    log.debug(`HTTP wait strategy complete`, { containerId: container.id });
  }

  private async handleContainerExit(container: Dockerode.Container) {
    const tail = 50;
    const lastLogs: string[] = [];
    const client = await getContainerRuntimeClient();
    let message: string;

    try {
      const stream = await client.container.logs(container, { tail });

      await new Promise((res) => {
        stream.on("data", (d) => lastLogs.push(d.trim())).on("end", res);
      });

      message = `Container exited during HTTP healthCheck, last ${tail} logs: ${lastLogs.join("\n")}`;
    } catch (err) {
      message = "Container exited during HTTP healthCheck, failed to get last logs";
    }

    log.error(message, { containerId: container.id });

    throw new Error(message);
  }

  private createInsecureAgent(): Agent | undefined {
    if (!this._allowInsecure) {
      return undefined;
    }

    return new Agent({
      connect: {
        rejectUnauthorized: false,
      },
    });
  }
}
