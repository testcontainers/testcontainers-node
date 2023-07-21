// import { createLabels } from "./create-labels";
// import { version } from "../../../package.json";
// import {
//   LABEL_TESTCONTAINERS,
//   LABEL_TESTCONTAINERS_LANG,
//   LABEL_TESTCONTAINERS_SESSION_ID,
//   LABEL_TESTCONTAINERS_VERSION,
// } from "../../labels";
//
// test("should set default labels", () => {
//   const labels = createLabels("sessionId", true);
//   expect(labels).toEqual({
//     [LABEL_TESTCONTAINERS]: "true",
//     [LABEL_TESTCONTAINERS_LANG]: "node",
//     [LABEL_TESTCONTAINERS_VERSION]: version,
//   });
// });
//
// test("should add session ID label when not reusable (for the Reaper)", () => {
//   const sessionId = createLabels("sessionId", false)[LABEL_TESTCONTAINERS_SESSION_ID];
//   expect(sessionId).toEqual("sessionId");
// });
//
// test("should not add session ID label when reusable (to avoid Reaper)", () => {
//   const sessionId = createLabels("sessionId", true)[LABEL_TESTCONTAINERS_SESSION_ID];
//   expect(sessionId).toBeUndefined();
// });
//
// test("should support extra labels", () => {
//   const labels = createLabels("sessionId", false, { key: "value" });
//   expect(labels).toEqual(expect.objectContaining({ key: "value" }));
// });
