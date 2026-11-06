import { existsSync } from "node:fs";

export const isInContainer = () => existsSync("/.dockerenv");
