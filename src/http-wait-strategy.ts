import Dockerode from "dockerode";
import { BoundPorts } from "./bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";
import { IntervalRetryStrategy } from "./retry-strategy";
import fetch, { Response } from "node-fetch";
import https, { Agent } from "https";

export class HttpWaitStrategy extends AbstractWaitStrategy {
  private readonly path: string;
  private readonly port: number;

  private protocol = "http";
  private method = "GET";
  private headers: { [key: string]: string } = {};
  private predicates: Array<(response: Response) => Promise<boolean>> = [];
  private _allowInsecure = false;
  private readTimeout = 1000;

  constructor(path: string, port: number) {
    super();
    this.path = path;
    this.port = port;
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

  public async waitUntilReady(container: Dockerode.Container, host: string, boundPorts: BoundPorts): Promise<void> {
    await new IntervalRetryStrategy<Response | undefined, Error>(this.readTimeout).retryUntil(
      async () => {
        try {
          const url = `${this.protocol}://${host}:${boundPorts.getBinding(this.port)}${this.path}`;
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
      (response) => {
        if (response === undefined) {
          return false;
        } else if (!this.predicates.length) {
          return response.ok;
        } else {
          return this.predicates.every((predicate) => predicate(response));
        }
      },
      () => {
        throw new Error(`URL ${this.path} not accessible after ${this.startupTimeout}ms for ${container.id}`);
      },
      this.startupTimeout
    );
  }

  private getAgent(): Agent | undefined {
    if (this._allowInsecure) {
      return new https.Agent({
        rejectUnauthorized: false,
      });
    }
  }
}
