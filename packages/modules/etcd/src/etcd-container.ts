import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

const ETCD_CLIENT_PORT = 2379;
const ETCD_PEER_PORT = 2380;

export class EtcdContainer extends GenericContainer {
  constructor(image = "quay.io/coreos/etcd:v3.6.0", nodeName = "etcd-test") {
    super(image);
    this.withExposedPorts(ETCD_CLIENT_PORT, ETCD_PEER_PORT).withCommand([
      "etcd",
      "--name",
      nodeName,
      "--initial-advertise-peer-urls",
      `http://0.0.0.0:${ETCD_PEER_PORT}`,
      "--advertise-client-urls",
      `http://0.0.0.0:${ETCD_CLIENT_PORT}`,
      "--listen-peer-urls",
      `http://0.0.0.0:${ETCD_PEER_PORT}`,
      "--listen-client-urls",
      `http://0.0.0.0:${ETCD_CLIENT_PORT}`,
    ]);
  }

  public override async start(): Promise<StartedEtcdContainer> {
    this.withWaitStrategy(Wait.forLogMessage(/"status":"SERVING"/));
    return new StartedEtcdContainer(await super.start());
  }
}

export class StartedEtcdContainer extends AbstractStartedContainer {
  public getClientPort(): number {
    return this.startedTestContainer.getMappedPort(ETCD_CLIENT_PORT);
  }

  public getPeerPort(): number {
    return this.startedTestContainer.getMappedPort(ETCD_PEER_PORT);
  }

  public getClientEndpoint(): string {
    return `http://${this.getHost()}:${this.getClientPort()}`;
  }

  public getPeerEndpoint(): string {
    return `http://${this.getHost()}:${this.getPeerPort()}`;
  }
}
