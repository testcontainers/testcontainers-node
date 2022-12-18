import { GenericContainer } from "testcontainers";

const container = await new GenericContainer("alpine:3.12").start();
await container.stop();
