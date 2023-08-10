import { GenericContainer } from "./generic-container";
import { checkContainerIsHealthy } from "../utils/test-helper";

describe("GenericContainer reuse", () => {
  jest.setTimeout(180_000);

  it("should not reuse the container by default", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    try {
      await expect(() =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withName("there_can_only_be_one")
          .withExposedPorts(8080)
          .start()
      ).rejects.toThrowError();
    } finally {
      await container.stop();
    }
  });

  it("should not reuse the container even when there is a candidate 1", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container);

    try {
      await expect(() =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withName("there_can_only_be_one")
          .withExposedPorts(8080)
          .start()
      ).rejects.toThrowError();
    } finally {
      await container.stop();
    }
  });

  it("should not reuse the container even when there is a candidate 2", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .start();
    await checkContainerIsHealthy(container);

    try {
      await expect(() =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withName("there_can_only_be_one")
          .withExposedPorts(8080)
          .withReuse()
          .start()
      ).rejects.toThrowError();
    } finally {
      await container.stop();
    }
  });

  it("should reuse the container", async () => {
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container1);

    const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).toBe(container2.getId());

    await container1.stop();
  });

  it("should create a new container when an existing reusable container has stopped", async () => {
    const container1 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await container1.stop();

    const container2 = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withReuse()
      .start();
    await checkContainerIsHealthy(container2);

    expect(container1.getId()).not.toBe(container2.getId());
    await container2.stop();
  });

  it("should keep the labels passed in when a new reusable container is created", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withName("there_can_only_be_one")
      .withExposedPorts(8080)
      .withLabels({ test: "foo", bar: "baz" })
      .withReuse()
      .start();

    expect(container.getLabels()).toEqual(expect.objectContaining({ test: "foo" }));
    await container.stop();
  });

  it("should not create multiple reusable containers if called in parallel", async () => {
    const [container1, container2] = await Promise.all([
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
      new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withReuse().start(),
    ]);

    expect(container1.getId()).toBe(container2.getId());
    await container2.stop();
  });
});
