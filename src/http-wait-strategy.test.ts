import { GenericContainer } from "./generic-container/generic-container";
import { Wait } from "./wait";
import { checkContainerIsHealthy, checkContainerIsHealthyTls } from "./test-helper";

jest.setTimeout(180_000);

describe("HttpWaitStrategy", () => {
  it("should wait for 200", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world", 8080))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should wait for status code", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/unknown-path", 8080).forStatusCode(404))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should timeout for mismatching status code", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/unknown-path", 8080).forStatusCode(200))
        .start()
    ).rejects.toThrowError("URL /unknown-path not accessible after 3000ms for");
  });

  it("should wait for status code matching", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(
        Wait.forHttp("/hello-world", 8080).forStatusCodeMatching(
          (statusCode) => statusCode === 404 || statusCode === 200
        )
      )
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should timeout for falsy status code matching", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080).forStatusCodeMatching(() => false))
        .start()
    ).rejects.toThrowError("URL /hello-world not accessible after 3000ms for");
  });

  it("should wait for response body predicate", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(
        Wait.forHttp("/hello-world", 8080).forResponsePredicate((response) => response === "hello-world")
      )
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should timeout for falsy response body predicate", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080).forResponsePredicate(() => false))
        .start()
    ).rejects.toThrowError("URL /hello-world not accessible after 3000ms for");
  });

  it("should set method", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world-post", 8080).withMethod("POST"))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set headers", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/header-or-400/custom", 8080).withHeaders({ custom: "value" }))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set basic credentials", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/auth", 8080).withBasicCredentials("user", "pass"))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  it("should set read timeout", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world-delay", 8080).withReadTimeout(5000))
      .start();

    await checkContainerIsHealthy(container);

    await container.stop();
  });

  describe("should wait for TLS", () => {
    it("disallow self-signed certificates", async () => {
      await expect(() =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withExposedPorts(8443)
          .withWaitStrategy(Wait.forHttp("/hello-world", 8443).usingTls())
          .withStartupTimeout(5_000)
          .start()
      ).rejects.toThrow();
    });

    it("allow self-signed certificates", async () => {
      const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8443)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8443).usingTls().allowInsecure())
        .start();

      await checkContainerIsHealthyTls(container);

      await container.stop();
    });
  });
});
