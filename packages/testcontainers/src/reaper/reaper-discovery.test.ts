import { describe, expect, it } from "vitest";

import { ContainerInfo } from "dockerode";
import { ContainerRuntimeClient } from "../container-runtime";
import { LABEL_TESTCONTAINERS_LANG, LABEL_TESTCONTAINERS_RYUK, LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { findReaperContainers } from "./reaper";

function stubClient(containers: Partial<ContainerInfo>[]): ContainerRuntimeClient {
  return { container: { list: async () => containers as ContainerInfo[] } } as unknown as ContainerRuntimeClient;
}

function reaperFixture(id: string, labels: Record<string, string>, state = "running"): Partial<ContainerInfo> {
  return {
    Id: id,
    State: state,
    Labels: {
      [LABEL_TESTCONTAINERS_RYUK]: "true",
      ...labels,
    },
    Created: 123,
  };
}

describe("findReaperContainers", () => {
  it("does not adopt reapers started by other language bindings (#1442)", async () => {
    const foreignReaper = reaperFixture("foreign", { [LABEL_TESTCONTAINERS_LANG]: "python" });
    const nodeReaper = reaperFixture("node", {
      [LABEL_TESTCONTAINERS_LANG]: "node",
      [LABEL_TESTCONTAINERS_SESSION_ID]: "0123456789ab",
    });

    const result = await findReaperContainers(stubClient([foreignReaper, nodeReaper]));

    expect(result.map((container) => container.Id)).toEqual(["node"]);
  });

  it("does not adopt a reaper without an identifiable session id", async () => {
    const anonymousReaper = reaperFixture("anonymous", { [LABEL_TESTCONTAINERS_LANG]: "node" });

    const result = await findReaperContainers(stubClient([anonymousReaper]));

    expect(result).toEqual([]);
  });

  it("does not adopt non-running containers or test reapers", async () => {
    const stoppedReaper = reaperFixture(
      "stopped",
      {
        [LABEL_TESTCONTAINERS_LANG]: "node",
        [LABEL_TESTCONTAINERS_SESSION_ID]: "0123456789ab",
      },
      "exited"
    );
    const testReaper = reaperFixture("test", {
      [LABEL_TESTCONTAINERS_LANG]: "node",
      [LABEL_TESTCONTAINERS_SESSION_ID]: "0123456789ab",
      TESTCONTAINERS_RYUK_TEST_LABEL: "true",
    });

    const result = await findReaperContainers(stubClient([stoppedReaper, testReaper]));

    expect(result).toEqual([]);
  });
});
