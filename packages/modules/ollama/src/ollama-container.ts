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

    getContainerRuntimeClient().then((client) => {
      const runtimes = client.info.containerRuntime.runtimes;
      if (runtimes.includes("nvidia")) {
        this.hostConfig.DeviceRequests = [
          {
            Driver: "nvidia",
            Count: -1,
            Capabilities: [["gpu"]],
          },
        ];
      }
    });
  }

  public override async start(): Promise<StartedOllamaContainer> {
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
}
