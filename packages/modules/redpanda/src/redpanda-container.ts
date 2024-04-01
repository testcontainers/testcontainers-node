import os from "os";
import fs from "fs";
import path from "path";
import { compile } from "handlebars";
import archiver from "archiver";
import {
  AbstractStartedContainer,
  GenericContainer,
  InspectResult,
  StartedTestContainer,
  Wait,
  getContainerRuntimeClient,
} from "testcontainers";

const REDPANDA_PORT = 9092;
const REDPANDA_ADMIN_PORT = 9644;
const SCHEMA_REGISTRY_PORT = 8081;
const REST_PROXY_PORT = 8082;

export class RedpandaContainer extends GenericContainer {
  constructor(image = "docker.redpanda.com/redpandadata/redpanda:v23.3.10") {
    super(image);
    this.withExposedPorts(REDPANDA_PORT, REDPANDA_ADMIN_PORT, SCHEMA_REGISTRY_PORT, REST_PROXY_PORT)
      .withEntrypoint(["/entrypoint-tc.sh"])
      .withUser("root:root")
      .withWaitStrategy(Wait.forLogMessage("Successfully started Redpanda!"))
      .withCopyFilesToContainer([
        {
          source: path.join(__dirname, "entrypoint-tc.sh"),
          target: "/entrypoint-tc.sh",
          mode: 0o777,
        },
        {
          source: path.join(__dirname, "bootstrap.yaml"),
          target: "/etc/redpanda/.bootstrap.yaml",
        },
      ])
      .withCommand(["redpanda", "start", "--mode=dev-container", "--smp=1", "--memory=1G"]);
  }

  public override async start(): Promise<StartedRedpandaContainer> {
    return new StartedRedpandaContainer(await super.start());
  }

  protected override async containerStarting(inspectResult: InspectResult) {
    const client = await getContainerRuntimeClient();
    const container = client.container.getById(inspectResult.name.substring(1));
    const renderedRedpandaFile = path.join(os.tmpdir(), `redpanda-${container.id}.yaml`);
    fs.writeFileSync(
      renderedRedpandaFile,
      this.renderRedpandaFile(client.info.containerRuntime.host, inspectResult.ports[REDPANDA_PORT][0].hostPort)
    );
    const tar = archiver("tar");
    tar.file(renderedRedpandaFile, { name: "/etc/redpanda/redpanda.yaml" });
    tar.finalize();
    await client.container.putArchive(container, tar, "/");
    fs.unlinkSync(renderedRedpandaFile);
  }

  private renderRedpandaFile(host: string, port: number): string {
    const template = compile(fs.readFileSync(path.join(__dirname, "redpanda.yaml.hbs"), "utf-8"));
    return template({
      kafkaApi: {
        advertisedHost: host,
        advertisedPort: port,
      },
    });
  }
}

export class StartedRedpandaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getBootstrapServers(): string {
    return `${this.getHost()}:${this.getMappedPort(REDPANDA_PORT)}`;
  }

  public getSchemaRegistryAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(SCHEMA_REGISTRY_PORT)}`;
  }

  public getAdminAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(REDPANDA_ADMIN_PORT)}`;
  }

  public getRestProxyAddress(): string {
    return `http://${this.getHost()}:${this.getMappedPort(REST_PROXY_PORT)}`;
  }
}
