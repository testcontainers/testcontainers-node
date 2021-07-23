import { dockerode } from "./dockerode";
import { getDockerHost } from "../get-docker-host";
import { log } from "../logger";
import { logSystemDiagnostics } from "../log-system-diagnostics";

log.debug("Resolving Docker host");
export const dockerHost: Promise<string> = getDockerHost(dockerode);
dockerHost.then((dockerHost) => log.debug(`Resolved Docker host: ${dockerHost}`));

logSystemDiagnostics(dockerode);
