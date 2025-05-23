import { RandomUuid } from "../common";
import { AbstractStartedContainer } from "../generic-container/abstract-started-container";
import { GenericContainer } from "../generic-container/generic-container";
import { StartedTestContainer } from "../test-container";

export class SocatContainer extends GenericContainer {
  private targets: { [exposePort: number]: string } = {};

  constructor(image = "alpine/socat:1.7.4.3-r0") {
    super(image);
    this.withEntrypoint(["/bin/sh"]);
    this.withName(`testcontainers-socat-${new RandomUuid().nextUuid()}`);
  }

  public withTarget(exposePort: number, host: string, internalPort = exposePort): this {
    this.withExposedPorts(exposePort);
    this.targets[exposePort] = `${host}:${internalPort}`;
    return this;
  }

  public override async start(): Promise<StartedSocatContainer> {
    const command = Object.entries(this.targets)
      .map(([exposePort, target]) => `socat TCP-LISTEN:${exposePort},fork,reuseaddr TCP:${target}`)
      .join(" & ");

    this.withCommand(["-c", command]);
    return new StartedSocatContainer(await super.start());
  }
}

export class StartedSocatContainer extends AbstractStartedContainer {
  constructor(startedTestcontainers: StartedTestContainer) {
    super(startedTestcontainers);
  }
}
