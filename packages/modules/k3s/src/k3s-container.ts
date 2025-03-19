import { basename } from "node:path";
import tar from "tar-stream";
import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

// TODO: Implement GenericContainer.withCgroupnsMode
// https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71160
type CgroupnsModeConfig = { CgroupnsMode?: "private" | "host" };

const KUBE_CONFIG_PATH = "/etc/rancher/k3s/k3s.yaml";
const KUBE_SECURE_PORT = 6443;
const RANCHER_WEBHOOK_PORT = 8443;

export class K3sContainer extends GenericContainer {
  constructor(image: string) {
    super(image);
    (this.hostConfig as CgroupnsModeConfig).CgroupnsMode = "host";
    this.withExposedPorts(KUBE_SECURE_PORT, RANCHER_WEBHOOK_PORT)
      .withPrivilegedMode()
      // Why do Java and .NET implementations bind cgroup but Golang does not?
      .withBindMounts([{ source: "/sys/fs/cgroup", target: "/sys/fs/cgroup" }])
      .withTmpFs({ "/run": "rw" })
      .withTmpFs({ "/var/run": "rw" })
      .withWaitStrategy(Wait.forLogMessage("Node controller sync successful"))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedK3sContainer> {
    const container = await super.start();
    const tarStream = await container.copyArchiveFromContainer(KUBE_CONFIG_PATH);
    const rawKubeConfig = await extractFromTarStream(tarStream, basename(KUBE_CONFIG_PATH));
    return new StartedK3sContainer(container, rawKubeConfig);
  }

  protected override async beforeContainerCreated() {
    let command = this.createOpts.Cmd ?? ["server", "--disable=traefik"];
    if (this.networkMode && this.networkAliases.length > 0) {
      const aliases = this.networkAliases.join();
      command = [...command, `--tls-san=${aliases}`];
    }
    this.withCommand(command);
  }
}

export class StartedK3sContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly rawKubeConfig: string
  ) {
    super(startedTestContainer);
  }

  public getKubeConfig(): string {
    const serverUrl = `https://${this.getHost()}:${this.getMappedPort(KUBE_SECURE_PORT)}`;
    return kubeConfigWithServerUrl(this.rawKubeConfig, serverUrl);
  }

  public getAliasedKubeConfig(networkAlias: string) {
    const serverUrl = `https://${networkAlias}:${KUBE_SECURE_PORT}`;
    return kubeConfigWithServerUrl(this.rawKubeConfig, serverUrl);
  }
}

async function extractFromTarStream(tarStream: NodeJS.ReadableStream, entryName: string): Promise<string> {
  const extract = tar.extract();
  tarStream.pipe(extract);

  let extracted = undefined;
  for await (const entry of extract) {
    const { header } = entry;
    if (header.type === "file" && header.name === entryName) {
      const chunks = [];
      for await (const chunk of entry) {
        chunks.push(chunk);
      }
      extracted = Buffer.concat(chunks).toString("utf-8");
    } else {
      entry.resume();
    }
  }

  if (!extracted) {
    throw new Error(`Failed to extract ${entryName} from archive`);
  }
  return extracted;
}

function kubeConfigWithServerUrl(kubeConfig: string, server: string): string {
  return kubeConfig.replace(/server:\s?[:/.\d\w]+/, `server: ${server}`);
}
