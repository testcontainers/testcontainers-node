import { assertEquals } from "@std/assert";
import { add } from "./main.ts";
import { GenericContainer } from "./src/index.ts";

Deno.test(async function addTest() {
  assertEquals(add(2, 3), 5);
  await new GenericContainer("redis")
      .withExposedPorts(6379)
      .start();
});
