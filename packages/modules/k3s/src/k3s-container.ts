import { AbstractStartedContainer, GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import tar from "tar-stream";
import { basename } from "node:path";

// TODO: Update @types/dockerode
// https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/71160
type CgroupnsModeConfig = { CgroupnsMode?: "private" | "host" };

const KUBE_CONFIG_PATH = "/etc/rancher/k3s/k3s.yaml";
const KUBE_SECURE_PORT = 6443;
const RANCHER_WEBHOOK_PORT = 8443;

/** Path to the k3s manifests directory. These are applied automatically on startup. */
export const K3S_SERVER_MANIFESTS = "/var/lib/rancher/k3s/server/manifests/";

export class K3sContainer extends GenericContainer {
  constructor(image = "rancher/k3s:v1.31.2-k3s1") {
    super(image);
    (this.hostConfig as CgroupnsModeConfig).CgroupnsMode = "host";
    this.withExposedPorts(KUBE_SECURE_PORT, RANCHER_WEBHOOK_PORT)
      .withPrivilegedMode()
      // TODO: Determine if/when bind mount is needed
      .withBindMounts([{ mode: "rw", source: "/sys/fs/cgroup", target: "/sys/fs/cgroup" }])
      .withTmpFs({ "/run": "rw" })
      .withTmpFs({ "/var/run": "rw" })
      // TODO: If tls-san is desirable, determine how to obtain the host address
      // .withCommand(["server", "--disable=traefik", `--tls-san=${this.getHost()}`])
      .withCommand(["server", "--disable=traefik"])
      .withWaitStrategy(Wait.forLogMessage("Node controller sync successful"))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedK3sContainer> {
    const container = await super.start();
    const tarStream = await container.copyArchiveFromContainer(KUBE_CONFIG_PATH);
    const kubeConfig = await extractFromTarStream(tarStream, basename(KUBE_CONFIG_PATH));
    return new StartedK3sContainer(container, kubeConfig);
  }
}

export class StartedK3sContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer, private readonly kubeConfig: string) {
    super(startedTestContainer);
  }

  public getKubeConfig(): string {
    const serverUrl = `https://${this.getHost()}:${this.getMappedPort(KUBE_SECURE_PORT)}`;
    return kubeConfigWithServerUrl(this.kubeConfig, serverUrl);
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

export function kubeConfigWithServerUrl(kubeConfig: string, server: string): string {
  return kubeConfig.replace(/server:\s?[:/.\d\w]+/, `server: ${server}`);
}
