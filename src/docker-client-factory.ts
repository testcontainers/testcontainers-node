import Dockerode from "dockerode";
import { Writable } from "stream";
import url from "url";
import { DockerClient, DockerodeClient } from "./docker-client";
import { FileHelper, RealFileHelper } from "./file-helper";
import log from "./logger";
import ProcessEnv = NodeJS.ProcessEnv;

export type Host = string;

export interface DockerClientFactory {
  getClient(): Promise<DockerClient>;
  getHost(): Promise<Host>;
}

export class DockerodeClientFactory implements DockerClientFactory {
  private readonly host: Promise<Host>;
  private readonly client: Promise<DockerClient>;

  constructor(env: ProcessEnv = process.env, private readonly fileHelper: FileHelper = new RealFileHelper()) {
    if (env.DOCKER_HOST) {
      const { host, client } = this.fromDockerHost(env.DOCKER_HOST);
      this.host = host;
      this.client = client;
    } else if (fileHelper.exists("/.dockerenv")) {
      const { host, client } = this.fromDefaultGateway();
      this.host = host;
      this.client = client;
    } else {
      const { host, client } = this.fromDefaults();
      this.host = host;
      this.client = client;
    }
  }

  public getClient(): Promise<DockerClient> {
    return this.client;
  }

  public getHost(): Promise<Host> {
    return this.host;
  }

  private fromDefaults() {
    log.info("Using default Docker configuration");

    const host = "localhost";
    const dockerode = new Dockerode();
    const client = new DockerodeClient(host, dockerode);

    return { host: Promise.resolve(host), client: Promise.resolve(client) };
  }

  private fromDefaultGateway() {
    log.info("Using inside Docker default gateway configuration");

    const dockerode = new Dockerode();

    const host: Promise<Host> = new Promise(async resolve => {
      const stream = new AsStringStream();
      await dockerode.run("alpine:3.5", ["sh", "-c", "ip route|awk '/default/ { print $3 }'"], stream);
      const output = stream.asString();

      if (output) {
        resolve(output.trim());
      }
    });

    const client: Promise<DockerodeClient> = new Promise(async resolve => {
      const aHost = await host;
      resolve(new DockerodeClient(aHost, dockerode));
    });

    return { host, client };
  }

  private fromDockerHost(dockerHost: string) {
    log.info(`Using Docker configuration from DOCKER_HOST: ${dockerHost}`);

    const { hostname: host, port } = url.parse(dockerHost);
    if (!host || !port) {
      throw new Error(`Invalid format for DOCKER_HOST, found: ${dockerHost}`);
    }

    const dockerode = new Dockerode({ host, port });
    const client = new DockerodeClient(host, dockerode);

    return { host: Promise.resolve(host), client: Promise.resolve(client) };
  }
}

class AsStringStream extends Writable {
  private chunks: string[] = [];

  public _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString());
  }

  public asString(): string {
    return this.chunks.reduce((result, chunk) => result + chunk, "");
  }
}
