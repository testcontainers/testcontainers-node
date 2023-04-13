import Dockerode from "dockerode";
import { HostPortWaitStrategy } from "./host-port-wait-strategy";
import { HostPortCheck, InternalPortCheck } from "../port-check";
import { Provider } from "../docker/docker-client";

export const defaultWaitStrategy = (
  host: string,
  dockerode: Dockerode,
  provider: Provider,
  container: Dockerode.Container
) => new HostPortWaitStrategy(new HostPortCheck(host), new InternalPortCheck(dockerode, provider, container));
