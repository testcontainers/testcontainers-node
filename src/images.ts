import { EnvConfig } from "./config";

export const REAPER_IMAGE = EnvConfig.getRyukContainerImage();
export const SSHD_IMAGE = EnvConfig.getSshdContainerImage();
