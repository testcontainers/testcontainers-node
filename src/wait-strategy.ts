import { Duration, TemporalUnit } from "node-duration";
import { ContainerState } from "./container-state";
import log from "./logger";

export interface WaitStrategy {
    waitUntilReady(containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
    protected startupTimeout = new Duration(10000, TemporalUnit.MILLISECONDS);

    public abstract waitUntilReady(containerState: ContainerState): Promise<void>;

    public withStartupTimeout(startupTimeout: Duration): WaitStrategy {
        this.startupTimeout = startupTimeout;
        return this;
    }
}

export class HostPortWaitStrategy extends AbstractWaitStrategy {
    public waitUntilReady(containerState: ContainerState): Promise<void> {
        log.info("Waiting for HostPortStrategy");
        return new Promise(resolve => setTimeout(resolve, 3000));
    }
}
