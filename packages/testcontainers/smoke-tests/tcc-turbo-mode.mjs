import { GenericContainer } from "../build/index.js";

const MAX_CONCURRENCY = 4;

const containers = await Promise.all(Array(MAX_CONCURRENCY).fill(0).map((_, i) =>
  new GenericContainer("alpine:3.12")
    .withName("there_can_only_be_one")
    .withCommand(["sleep", "infinity"])
    .start()));

await Promise.all(containers.map(container => container.stop()));
