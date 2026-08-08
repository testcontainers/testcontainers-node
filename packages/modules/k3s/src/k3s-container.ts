import { basename } from "node:path";
import { buffer } from "node:stream/consumers";
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
    const kubeConfigName = basename(KUBE_CONFIG_PATH);
    // Docker returns only the small kubeconfig here, so use Modern TAR's buffered API directly.
    const [{ unpackTar }, archive] = await Promise.all([
      import("modern-tar"),
      container.copyArchiveFromContainer(KUBE_CONFIG_PATH).then(buffer),
    ]);
    const [entry] = await unpackTar(archive, {
      strict: true,
      filter: (header) => header.type === "file" && header.name === kubeConfigName,
    });
    if (!entry?.data?.length) {
      throw new Error(`Failed to extract ${kubeConfigName} from archive`);
    }
    const rawKubeConfig = new TextDecoder().decode(entry.data);
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

function kubeConfigWithServerUrl(kubeConfig: string, server: string): string {
  return kubeConfig.replace(/server:\s?[:/.\d\w]+/, `server: ${server}`);
}
