import { logSystemDiagnostics } from "../log-system-diagnostics";
import { getDockerHost } from "./get-docker-host";
import { dockerode } from "./dockerode";

export const dockerHost = getDockerHost(dockerode);

logSystemDiagnostics();
