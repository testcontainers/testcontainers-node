const { GenericContainer } = require("./build/index");

// CommonJS has no top-level await, so the async function is invoked without being awaited.
void (async () => {
  try {
    const container = await new GenericContainer("alpine:3.12").withCommand(["sleep", "infinity"]).start();

    await container.stop();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
