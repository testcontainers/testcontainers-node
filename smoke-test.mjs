import { GenericContainer } from "./dist/index.js";

const container = await new GenericContainer("alpine:3.12").start();
await container.stop();
