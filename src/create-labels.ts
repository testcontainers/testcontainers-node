// import {
//   LABEL_TESTCONTAINERS,
//   LABEL_TESTCONTAINERS_LANG,
//   LABEL_TESTCONTAINERS_SESSION_ID,
//   LABEL_TESTCONTAINERS_VERSION,
// } from "../../labels";
// import { version } from "../../../package.json";
// import { Labels } from "../types";
//
// export const createLabels = (sessionId: string, reusable: boolean, extraLabels: Labels = {}): Labels => {
//   const labels: Labels = {
//     ...extraLabels,
//     [LABEL_TESTCONTAINERS]: "true",
//     [LABEL_TESTCONTAINERS_LANG]: "node",
//     [LABEL_TESTCONTAINERS_VERSION]: version,
//   };
//
//   if (!reusable) {
//     labels[LABEL_TESTCONTAINERS_SESSION_ID] = sessionId;
//   }
//
//   return labels;
// };
