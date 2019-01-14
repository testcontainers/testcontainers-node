import { Duration, TemporalUnit } from "node-duration";
import { Clock, SystemClock, Time } from "./clock";
import { ContainerState } from "./container-state";
import log from "./logger";
import { Port } from "./port";
import { PortCheckClient, SystemPortCheckClient } from "./port-check-client";

export interface WaitStrategy {
    waitUntilReady(containerState: ContainerState): Promise<void>;
    withStartupTimeout(startupTimeout: Duration): WaitStrategy;
}

abstract class AbstractWaitStrategy implements WaitStrategy {
    protected startupTimeout = new Duration(10_000, TemporalUnit.MILLISECONDS);

    public abstract waitUntilReady(containerState: ContainerState): Promise<void>;

    public withStartupTimeout(startupTimeout: Duration): WaitStrategy {
        this.startupTimeout = startupTimeout;
        return this;
    }
}

export class HostPortWaitStrategy extends AbstractWaitStrategy {
    constructor(
        private readonly portCheckClient: PortCheckClient = new SystemPortCheckClient(),
        private readonly clock: Clock = new SystemClock()
    ) {
        super();
    }

    public async waitUntilReady(containerState: ContainerState): Promise<void> {
        const startTime = this.clock.getTime();

        for (const hostPort of containerState.getHostPorts()) {
            log.info(`Waiting for port :${hostPort}`);
            if (!(await this.waitForPort(hostPort, startTime))) {
                throw new Error(
                    `Port :${hostPort} not bound after ${this.startupTimeout.get(TemporalUnit.MILLISECONDS)}ms`
                );
            }
        }
    }

    private async waitForPort(port: Port, startTime: Time): Promise<boolean> {
        if (!(await this.portCheckClient.isFree(port))) {
            return true;
        }

        const nowTime = this.clock.getTime();
        if (this.hasStartupTimeoutElapsed(startTime, nowTime)) {
            return false;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        return this.waitForPort(port, startTime);
    }

    private hasStartupTimeoutElapsed(startTime: Time, endTime: Time): boolean {
        return endTime - startTime > this.startupTimeout.get(TemporalUnit.MILLISECONDS);
    }
}
