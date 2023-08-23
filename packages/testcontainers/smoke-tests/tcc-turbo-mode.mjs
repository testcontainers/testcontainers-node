import { GenericContainer } from "../build/index.js";

const container = await new GenericContainer("alpine:3.12")
  .withName("there_can_only_be_one")
  .withCommand(["sleep", "infinity"])
  .start();

await container.stop();
