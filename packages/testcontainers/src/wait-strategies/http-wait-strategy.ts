import type Dockerode from "dockerode";
import { Agent, request } from "undici";
import { log } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import type { BoundPorts } from "../utils/bound-ports";
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
    options: HttpWaitStrategyOptions
  ) {
    super();
    if (options.abortOnContainerExit !== undefined) {
      this.withAbortOnContainerExit(options.abortOnContainerExit);
    }
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

    const client = await getContainerRuntimeClient();
    // Scoped per invocation: one strategy instance can drive concurrent waits, so a shared
    // agent would let one finished wait destroy a dispatcher another is still using.
    const agent = this.createInsecureAgent();

    try {
      await this.retryUntil(
        container,
        this.readTimeoutMs,
        async () => {
          try {
            const url = `${this.protocol}://${client.info.containerRuntime.host}:${boundPorts.getBinding(this.port)}${
              this.path
            }`;
            return await this.sendRequest(url, agent);
          } catch {
            return undefined;
          }
        },
        (response) => this.matchesPredicates(response),
        () => {
          const message = `URL ${this.path} not accessible after ${this.startupTimeoutMs}ms`;
          log.error(message, { containerId: container.id });
          throw new Error(message);
        }
      );
    } finally {
      // Force-close: status-only predicates never read the body, so a graceful close() could
      // hang waiting on unreleased connections. Nothing left to drain once the wait is done.
      await agent?.destroy();
    }

    log.debug(`HTTP wait strategy complete`, { containerId: container.id });
  }

  private async sendRequest(url: string, agent: Agent | undefined): Promise<Response> {
    return undiciResponseToFetchResponse(
      await request(url, {
        method: this.method,
        signal: AbortSignal.timeout(this.readTimeoutMs),
        headers: this.headers,
        dispatcher: agent,
      })
    );
  }

  private async matchesPredicates(response: Response | undefined): Promise<boolean> {
    if (response === undefined) {
      return false;
    }
    if (!this.predicates.length) {
      return response.ok;
    }
    for (const predicate of this.predicates) {
      const result = await predicate(response);
      if (!result) {
        return false;
      }
    }
    return true;
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
