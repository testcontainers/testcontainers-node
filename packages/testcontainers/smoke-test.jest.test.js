const { GenericContainer } = require("./build/index");

jest.setTimeout(120_000);

test("starts a container under Jest CommonJS runtime", async () => {
  let container;
  try {
    container = await new GenericContainer("alpine:3.12")
      .withCommand(["sleep", "infinity"])
      .start();
  } finally {
    await container?.stop();
  }
});
