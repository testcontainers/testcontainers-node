import { createLabels } from "./create-labels.js";
import { DockerImageName } from "../../docker-image-name.js";
import { REAPER_IMAGE } from "../../images.js";
import { LABEL_SESSION_ID } from "../../labels.js";

test("should add session ID label when not reusable (for the Reaper)", () => {
  expect(createLabels(false)).toEqual({ [LABEL_SESSION_ID]: expect.any(String) });
});

test("should not add session ID label when reusable (to avoid Reaper)", () => {
  expect(createLabels(true)).toEqual({});
});

test("should not add session ID label when the container is the Reaper (to avoid Reaper killing self)", () => {
  const labels = createLabels(false, DockerImageName.fromString(REAPER_IMAGE));
  expect(labels).toEqual({});
});

test("should support extra labels", () => {
  expect(createLabels(false, undefined, { key: "value" })).toEqual({
    [LABEL_SESSION_ID]: expect.any(String),
    key: "value",
  });
});
