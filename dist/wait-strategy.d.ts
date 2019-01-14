import { Duration } from "node-duration";
import { ContainerState } from "./container-state";
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
    waitUntilReady(containerState: ContainerState): Promise<void>;
}
export {};
