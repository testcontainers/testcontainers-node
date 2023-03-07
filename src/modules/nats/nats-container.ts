import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import { RandomUuid } from "../../uuid";
import { AbstractStartedContainer } from "../abstract-started-container";
import { Wait } from "../../wait";

const CLIENT_PORT = 4222;
const ROUTING_PORT_FOR_CLUSTERING = 6222;
const HTTP_MANAGEMENT_PORT = 8222;

const USER_ARGUMENT_KEY = "--user";
const PASS_ARGUMENT_KEY = "--pass";

export class NatsContainer extends GenericContainer {
  private args: { [name: string]: string } = {};

  constructor(image = "nats:2.8-alpine") {
    super(image);
    this.args[USER_ARGUMENT_KEY] = new RandomUuid().nextUuid();
    this.args[PASS_ARGUMENT_KEY] = new RandomUuid().nextUuid();
  }

  public withUsername(user: string): this {
    this.args[USER_ARGUMENT_KEY] = user;
    return this;
  }

  public withPass(pass: string): this {
    this.args[PASS_ARGUMENT_KEY] = pass;
    return this;
  }

  public withArg(name: string, value: string) {
    name = NatsContainer.ensureDashInFrontOfArgumentName(name);
    this.args[name] = value;
    return this;
  }

  private static ensureDashInFrontOfArgumentName(name: string): string {
    if (name.startsWith("--") || name.startsWith("-")) {
      return name;
    }

    if (name.length == 1) {
      return "-" + name;
    } else {
      return "--" + name;
    }
  }

  public override async start(): Promise<StartedNatsContainer> {
    function buildCmdsFromArgs(args: { [p: string]: string }): string[] {
      const result: string[] = [];
      result.push("nats-server");

      for (const argsKey in args) {
        result.push(argsKey);
        result.push(args[argsKey]);
      }
      return result;
    }

    this.withCommand(buildCmdsFromArgs(this.args))
      .withExposedPorts(
        ...(this.hasExposedPorts ? this.ports : [CLIENT_PORT, ROUTING_PORT_FOR_CLUSTERING, HTTP_MANAGEMENT_PORT])
      )
      .withWaitStrategy(Wait.forLogMessage(/.*Server is ready.*/))
      .withStartupTimeout(120_000);

    return new StartedNatsContainer(await super.start(), this.getUser(), this.getPass());
  }

  private getUser(): string {
    return this.args[USER_ARGUMENT_KEY];
  }

  private getPass(): string {
    return this.args[PASS_ARGUMENT_KEY];
  }
}

export class StartedNatsContainer extends AbstractStartedContainer {
  private readonly connectionOptions: NatsConnectionOptions;

  constructor(startedTestContainer: StartedTestContainer, readonly username: string, readonly password: string) {
    super(startedTestContainer);
    const port = startedTestContainer.getMappedPort(CLIENT_PORT);
    this.connectionOptions = {
      servers: `${this.startedTestContainer.getHost()}:${port}`,
      user: this.username,
      pass: this.password,
    };
  }

  public getConnectionOptions(): NatsConnectionOptions {
    return this.connectionOptions;
  }
}

export interface NatsConnectionOptions {
  debug?: boolean;
  maxPingOut?: number;
  maxReconnectAttempts?: number;
  name?: string;
  noEcho?: boolean;
  noRandomize?: boolean;
  pass?: string;
  pedantic?: boolean;
  pingInterval?: number;
  port?: number;
  reconnect?: boolean;
  reconnectDelayHandler?: () => number;
  reconnectJitter?: number;
  reconnectJitterTLS?: number;
  reconnectTimeWait?: number;
  servers?: Array<string> | string;
  timeout?: number;
  tls?: NatsTlsOptions;
  token?: string;
  user?: string;
  verbose?: boolean;
  waitOnFirstConnect?: boolean;
  ignoreClusterUpdates?: boolean;
  inboxPrefix?: string;
}
export interface NatsTlsOptions {
  certFile?: string;
  cert?: string;
  caFile?: string;
  ca?: string;
  keyFile?: string;
  key?: string;
}
