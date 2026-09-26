import { beforeAll, describe, expect, it } from "vitest";

import { ContainerRuntimeClient, getContainerRuntimeClient } from "../container-runtime";
import { GenericContainer } from "../generic-container/generic-container";
import { LABEL_TESTCONTAINERS_LANG, LABEL_TESTCONTAINERS_RYUK } from "../utils/labels";
import { findReaperContainers } from "./reaper";

describe("Reaper discovery against a shared host", () => {
  let client: ContainerRuntimeClient;
  let dockerAvailable = true;

  beforeAll(async () => {
    try {
      client = await getContainerRuntimeClient();
      await client.container.list();
    } catch {
      dockerAvailable = false;
    }
  });

  it("does not adopt a reaper container started by another language binding (#1442)", async () => {
    if (!dockerAvailable) return;

    const foreignReaper = await new GenericContainer("alpine:3.20")
      .withCommand(["sleep", "60"])
      .withLabels({
        [LABEL_TESTCONTAINERS_RYUK]: "true",
        [LABEL_TESTCONTAINERS_LANG]: "python",
      })
      .start();

    try {
      const result = await findReaperContainers(client);
      expect(result.map((container) => container.Id)).not.toContain(foreignReaper.getId());
    } finally {
      await foreignReaper.stop({ timeout: 1000 });
    }
  });
});
