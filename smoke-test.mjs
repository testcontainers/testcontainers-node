import { GenericContainer } from "./dist/src/index.js";

const container = await new GenericContainer("alpine:3.12")
  .withCommand(["sleep", "infinity"])
  .start();

await container.stop();
