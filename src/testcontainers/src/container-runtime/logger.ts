import { Logger } from "../common";

export const composeLog = new Logger("testcontainers:compose", false);
export const buildLog = new Logger("testcontainers:build", false);
export const pullLog = new Logger("testcontainers:pull", false);
export const execLog = new Logger("testcontainers:exec", false);
