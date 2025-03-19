import type { StartedTestContainer } from "testcontainers";
import { AbstractStartedContainer, GenericContainer, Wait } from "testcontainers";

const PORT = 4443;
const DEFAULT_IMAGE = "fsouza/fake-gcs-server";

export class CloudStorageEmulatorContainer extends GenericContainer {
  private _externalURL?: string;
  private _publicHost?: string;
  private autoUpdateExternalUrl = true;

  constructor(image = DEFAULT_IMAGE) {
    super(image);

    this.withExposedPorts(PORT).withWaitStrategy(Wait.forLogMessage("server started")).withStartupTimeout(120_000);
  }

  public withExternalURL(url: string): CloudStorageEmulatorContainer {
    this._externalURL = url;
    return this;
  }

  public withPublicHost(host: string): CloudStorageEmulatorContainer {
    this._publicHost = host;
    return this;
  }

  public withAutoUpdateExternalUrl(autoUpdateExternalUrl: boolean): this {
    this.autoUpdateExternalUrl = autoUpdateExternalUrl;
    return this;
  }

  public override async start(): Promise<StartedCloudStorageEmulatorContainer> {
    // Determine the valid entrypoint command when starting the Cloud Storage server

    const entrypoint = [
      "fake-gcs-server",
      // Bind to all interfaces
      "-host",
      "0.0.0.0",
      // Using thre http scheme for the server
      "-scheme",
      "http",
      ...(this._externalURL ? ["-external-url", this._externalURL] : []),
      ...(this._publicHost ? ["-public-host", this._publicHost] : []),
    ];
    this.withEntrypoint(entrypoint);

    const container = new StartedCloudStorageEmulatorContainer(await super.start(), this._externalURL);

    if (this.autoUpdateExternalUrl && this._externalURL === undefined) {
      // Done after starting because we don't know the port ahead of time
      await container.updateExternalUrl(container.getEmulatorEndpoint());
    }

    return container;
  }
}

export class StartedCloudStorageEmulatorContainer extends AbstractStartedContainer {
  private _externalURL?: string;
  private _publicHost?: string;

  constructor(startedTestContainer: StartedTestContainer, externalURL?: string, publicHost?: string) {
    super(startedTestContainer);
    this._externalURL = externalURL;
    this._publicHost = publicHost ?? "storage.googleapis.com";
  }

  public async updateExternalUrl(url: string) {
    this._externalURL = url;
    await this.processServerConfigChange();
  }

  public async updatePublicHost(host: string) {
    this._publicHost = host;
    await this.processServerConfigChange();
  }

  public getEmulatorEndpoint() {
    return `http://${this.getHost()}:${this.getMappedPort(PORT)}`;
  }

  /**
   * Sends a PUT request to the fake-gcs-server to update the server configuration for externalUrl and publicHost.
   */
  private async processServerConfigChange() {
    const requestUrl = `${this.getEmulatorEndpoint()}/_internal/config`;
    const response = await fetch(requestUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        {
          externalUrl: this._externalURL,
          publicHost: this._publicHost,
        },
        null,
        2
      ),
    });

    if (!response.ok) {
      console.warn(`error updating fake-gcs-server with external url, response status code: ${response.status}`);
    }
  }

  /**
   * @return a <code>host:port</code> pair corresponding to the address on which the emulator is
   * reachable from the test host machine.
   */
  public getExternalUrl(): string | undefined {
    return this._externalURL;
  }
}
