import { createLabels } from "./create-labels";
import { DockerImageName } from "../../docker-image-name";
import { REAPER_IMAGE } from "../../images";
import { version } from "../../../package.json";
import {
  LABEL_TESTCONTAINERS,
  LABEL_TESTCONTAINERS_LANG,
  LABEL_TESTCONTAINERS_SESSION_ID,
  LABEL_TESTCONTAINERS_VERSION,
} from "../../labels";

test("should set default labels", () => {
  const labels = createLabels(true);
  expect(labels).toEqual({
    [LABEL_TESTCONTAINERS]: "true",
    [LABEL_TESTCONTAINERS_LANG]: "node",
    [LABEL_TESTCONTAINERS_VERSION]: version,
  });
});

test("should add session ID label when not reusable (for the Reaper)", () => {
  const sessionId = createLabels(false)[LABEL_TESTCONTAINERS_SESSION_ID];
  expect(sessionId).toEqual(expect.any(String));
});

test("should not add session ID label when reusable (to avoid Reaper)", () => {
  const sessionId = createLabels(true)[LABEL_TESTCONTAINERS_SESSION_ID];
  expect(sessionId).toBeUndefined();
});

test("should not add session ID label when the container is the Reaper (to avoid Reaper killing self)", () => {
  const sessionId = createLabels(false, DockerImageName.fromString(REAPER_IMAGE))[LABEL_TESTCONTAINERS_SESSION_ID];
  expect(sessionId).toBeUndefined();
});

test("should support extra labels", () => {
  const labels = createLabels(false, undefined, { key: "value" });
  expect(labels).toEqual(expect.objectContaining({ key: "value" }));
});
