import { Duration } from "node-duration";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { PortCheck } from "./port-check";
export interface WaitStrategy {
    waitUntilReady(containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}
declare abstract class AbstractWaitStrategy implements WaitStrategy {
    protected startupTimeout: Duration;
    abstract waitUntilReady(containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}
export declare class HostPortWaitStrategy extends AbstractWaitStrategy {
    private readonly dockerClient;
    private readonly hostPortCheck;
    private readonly internalPortCheck;
    constructor(dockerClient: DockerClient, hostPortCheck: PortCheck, internalPortCheck: PortCheck);
    waitUntilReady(containerState: ContainerState): Promise<void>;
    private waitForHostPorts;
    private waitForInternalPorts;
    private waitForPort;
}
export {};
