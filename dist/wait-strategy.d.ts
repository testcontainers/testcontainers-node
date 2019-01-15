import { Container } from "dockerode";
import { Duration } from "node-duration";
import { Clock } from "./clock";
import { ContainerState } from "./container-state";
import { DockerClient } from "./docker-client";
import { PortCheckClient } from "./port-check-client";
export interface WaitStrategy {
    waitUntilReady(container: Container, containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}
declare abstract class AbstractWaitStrategy implements WaitStrategy {
    protected startupTimeout: Duration;
    abstract waitUntilReady(container: Container, containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}
export declare class HostPortWaitStrategy extends AbstractWaitStrategy {
    private readonly dockerClient;
    private readonly portCheckClient;
    private readonly clock;
    constructor(dockerClient: DockerClient, portCheckClient?: PortCheckClient, clock?: Clock);
    waitUntilReady(container: Container, containerState: ContainerState): Promise<void>;
    private hostPortCheck;
    private internalPortCheck;
    private hasStartupTimeoutElapsed;
}
export {};
