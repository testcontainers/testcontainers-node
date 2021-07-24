import Dockerode from "dockerode";
import { log } from "../logger";

log.debug("Creating new Docker instance");
export const dockerode = new Dockerode();
