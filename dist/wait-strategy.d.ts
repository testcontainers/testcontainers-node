import { Duration } from "node-duration";
import { Clock } from "./clock";
import { ContainerState } from "./container-state";
import { PortCheckClient } from "./port-check-client";
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
    private readonly portCheckClient;
    private readonly clock;
    constructor(portCheckClient?: PortCheckClient, clock?: Clock);
    waitUntilReady(containerState: ContainerState): Promise<void>;
    private hostPortCheck;
    private waitForPort;
    private hasStartupTimeoutElapsed;
}
export {};
