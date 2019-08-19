import fetch from "node-fetch";
import path from "path";
import { GenericContainer } from "./generic-container";
import { abortOnExistingImage, withBuildArg, withContext, withImageName, withImageTag } from "./options";
import { Wait } from "./wait";

describe("GenericContainer", () => {
  jest.setTimeout(90000);

  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await container.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await container.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should set environment variables", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withEnv("customKey", "customValue")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();
    expect(responseBody.customKey).toBe("customValue");

    await container.stop();
  });

  it("should set command", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withCmd(["node", "index.js", "one", "two", "three"])
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/cmd`);
    const responseBody = await response.json();
    expect(responseBody).toEqual(["/usr/local/bin/node", "/index.js", "one", "two", "three"]);

    await container.stop();
  });

  it("should build and start from a Dockerfile", async () => {
    const context = path.resolve(__dirname, "..", "docker");
    const container = await GenericContainer.fromDockerfile(withContext(context));
    const startedContainer = await container.withExposedPorts(8080).start();

    const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await startedContainer.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should build and start from a Dockerfile with build arguments", async () => {
    const context = path.resolve(__dirname, "..", "docker-with-buildargs");
    const container = await GenericContainer.fromDockerfile(withContext(context), withBuildArg("VERSION", "10-alpine"));
    const startedContainer = await container.withExposedPorts(8080).start();

    const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await startedContainer.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should not build and start from a Dockerfile with missing build arguments", async () => {
    const context = path.resolve(__dirname, "..", "docker-with-buildargs");

    await expect(GenericContainer.fromDockerfile(withContext(context))).rejects.toThrowError("Failed to build image");
  });

  it("should work for mysql", async () => {
    const container = await new GenericContainer("mysql")
      .withEnv("MYSQL_ROOT_PASSWORD", "my-root-pw")
      .withExposedPorts(3306)
      .start();

    await container.stop();
  });

  it("should allow for exec'ing in running container", async () => {
    const container = await new GenericContainer("mysql")
      .withEnv("MYSQL_ALLOW_EMPTY_PASSWORD", "true")
      .withWaitStrategy(Wait.forLogMessage("ready for connections"))
      .start();

    const { output, exitCode } = await container.exec([
      "mysql",
      "-B",
      "--disable-column-names",
      "--execute",
      "show databases"
    ]);
    expect(exitCode).toBe(0);
    expect(output).toContain("performance_schema");

    await container.stop();
  });

  it("should work for couch db", async () => {
    const container = await new GenericContainer("couchdb").withExposedPorts(5984).start();

    await container.stop();
  });

  it("should build and start named container from a Dockerfile", async () => {
    const context = path.resolve(__dirname, "..", "docker");
    const container = await GenericContainer.fromDockerfile(
      withContext(context),
      withImageName("testimage"),
      withImageTag("testtag"),
      abortOnExistingImage()
    );
    expect(container.image).toBe("testimage");
    expect(container.tag).toBe("testtag");
  });
});
