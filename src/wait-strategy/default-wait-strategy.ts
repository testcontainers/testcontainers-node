import Dockerode from "dockerode";
import { HostPortWaitStrategy } from "./host-port-wait-strategy";
import { HostPortCheck, InternalPortCheck } from "../port-check";

export const defaultWaitStrategy = (host: string, container: Dockerode.Container) =>
  new HostPortWaitStrategy(new HostPortCheck(host), new InternalPortCheck(container));
