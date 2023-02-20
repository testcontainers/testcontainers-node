const { GenericContainer } = require("./dist/src/index");

(async () => {
  const container = await new GenericContainer("alpine:3.12")
    .withCommand(["sleep", "infinity"])
    .start();

  await container.stop();
})();
