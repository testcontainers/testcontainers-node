import { GenericContainer } from "./build/index.js";

test("starts a container under Vitest runtime", { timeout: 120_000 }, async () => {
  let container;
  try {
    container = await new GenericContainer("alpine:3.12")
      .withCommand(["sleep", "infinity"])
      .start();
  } finally {
    await container?.stop();
  }
});
