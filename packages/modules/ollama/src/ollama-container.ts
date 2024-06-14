import {
  AbstractStartedContainer,
  GenericContainer,
  getContainerRuntimeClient,
  StartedTestContainer,
  Wait,
} from "testcontainers";

export const OLLAMA_PORT = 11434;

export class OllamaContainer extends GenericContainer {
  constructor(image = "ollama/ollama") {
    super(image);
    this.withExposedPorts(OLLAMA_PORT)
      .withWaitStrategy(Wait.forLogMessage("Listening on "))
      .withStartupTimeout(120_000);
  }

  public override async start(): Promise<StartedOllamaContainer> {
    const containerRuntimeClient = await getContainerRuntimeClient();
    const runtimes = containerRuntimeClient.info.containerRuntime.runtimes;
    if (runtimes.includes("nvidia")) {
      this.hostConfig.DeviceRequests = [
        {
          Driver: "nvidia",
          Count: -1,
          Capabilities: [["gpu"]],
        },
      ];
    }

    return new StartedOllamaContainer(await super.start());
  }
}

export class StartedOllamaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(OLLAMA_PORT);
  }

  public getEndpoint(): string {
    return `http://${this.getHost()}:${this.getPort().toString()}`;
  }

  public async commitToImage(imageName: string): Promise<NodeJS.ReadableStream> {
    const client = await getContainerRuntimeClient();
    const dockerode = client.container.dockerode;
    return dockerode.getContainer(this.getId()).commit({ repo: imageName });
  }
}
