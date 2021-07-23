import { logSystemDiagnostics } from "../log-system-diagnostics";
import { getDockerHost } from "./get-docker-host";

export const dockerHost: Promise<string> = getDockerHost();

logSystemDiagnostics();
