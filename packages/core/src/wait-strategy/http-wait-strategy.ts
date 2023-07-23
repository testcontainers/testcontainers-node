import Dockerode from "dockerode";
import { BoundPorts } from "../bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";
import fetch, { Response } from "node-fetch";
import https, { Agent } from "https";
import { log } from "@testcontainers/logger";
import { IntervalRetry } from "@testcontainers/common";
import { getContainerRuntimeClient } from "@testcontainers/container-runtime";

export class HttpWaitStrategy extends AbstractWaitStrategy {
  private protocol = "http";
  private method = "GET";
  private headers: { [key: string]: string } = {};
  private predicates: Array<(response: Response) => Promise<boolean>> = [];
  private _allowInsecure = false;
  private readTimeout = 1000;

  constructor(private readonly path: string, private readonly port: number) {
    super();
  }

  public forStatusCode(statusCode: number): HttpWaitStrategy {
    this.predicates.push(async (response: Response) => response.status === statusCode);
    return this;
  }

  public forStatusCodeMatching(predicate: (statusCode: number) => boolean): HttpWaitStrategy {
    this.predicates.push(async (response: Response) => predicate(response.status));
    return this;
  }

  public forResponsePredicate(predicate: (response: string) => boolean): HttpWaitStrategy {
    this.predicates.push(async (response: Response) => predicate(await response.text()));
    return this;
  }

  public withMethod(method: string): HttpWaitStrategy {
    this.method = method;
    return this;
  }

  public withHeaders(headers: { [key: string]: string }): HttpWaitStrategy {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  public withBasicCredentials(username: string, password: string): HttpWaitStrategy {
    const base64Encoded = Buffer.from(`${username}:${password}`).toString("base64");
    this.headers = { ...this.headers, Authorization: `Basic ${base64Encoded}` };
    return this;
  }

  public withReadTimeout(readTimeout: number): HttpWaitStrategy {
    this.readTimeout = readTimeout;
    return this;
  }

  public usingTls(): HttpWaitStrategy {
    this.protocol = "https";
    return this;
  }

  public allowInsecure(): HttpWaitStrategy {
    this._allowInsecure = true;
    return this;
  }

  public async waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void> {
    log.debug(`Waiting for HTTP...`, { containerId: container.id });
    const client = await getContainerRuntimeClient();

    await new IntervalRetry<Response | undefined, Error>(this.readTimeout).retryUntil(
      async () => {
        try {
          const url = `${this.protocol}://${client.info.containerRuntime.host}:${boundPorts.getBinding(this.port)}${
            this.path
          }`;
          return await fetch(url, {
            method: this.method,
            timeout: this.readTimeout,
            headers: this.headers,
            agent: this.getAgent(),
          });
        } catch {
          return undefined;
        }
      },
      async (response) => {
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
        const message = `URL ${this.path} not accessible after ${this.startupTimeout}ms`;
        log.error(message, { containerId: container.id });
        throw new Error(message);
      },
      this.startupTimeout
    );

    log.debug(`HTTP wait strategy complete`, { containerId: container.id });
  }

  private getAgent(): Agent | undefined {
    if (this._allowInsecure) {
      return new https.Agent({
        rejectUnauthorized: false,
      });
    }
  }
}