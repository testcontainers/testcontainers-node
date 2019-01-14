"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_duration_1 = require("node-duration");
const clock_1 = require("./clock");
const logger_1 = __importDefault(require("./logger"));
const port_check_client_1 = require("./port-check-client");
const retry_strategy_1 = require("./retry-strategy");
class AbstractWaitStrategy {
    constructor() {
        this.startupTimeout = new node_duration_1.Duration(10000, node_duration_1.TemporalUnit.MILLISECONDS);
    }
    withStartupTimeout(startupTimeout) {
        this.startupTimeout = startupTimeout;
        return this;
    }
}
class HostPortWaitStrategy extends AbstractWaitStrategy {
    constructor(portCheckClient = new port_check_client_1.SystemPortCheckClient(), clock = new clock_1.SystemClock()) {
        super();
        this.portCheckClient = portCheckClient;
        this.clock = clock;
    }
    waitUntilReady(containerState) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = this.clock.getTime();
            for (const hostPort of containerState.getHostPorts()) {
                logger_1.default.info(`Waiting for port :${hostPort}`);
                if (!(yield this.waitForPort(hostPort, startTime))) {
                    throw new Error(`Port :${hostPort} not bound after ${this.startupTimeout.get(node_duration_1.TemporalUnit.MILLISECONDS)}ms`);
                }
            }
        });
    }
    waitForPort(port, startTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const retryStrategy = new retry_strategy_1.SimpleRetryStrategy(new node_duration_1.Duration(100, node_duration_1.TemporalUnit.MILLISECONDS));
            return retryStrategy.retry(() => __awaiter(this, void 0, void 0, function* () {
                if (!(yield this.portCheckClient.isFree(port))) {
                    return true;
                }
                if (this.hasStartupTimeoutElapsed(startTime, this.clock.getTime())) {
                    return false;
                }
            }));
        });
    }
    hasStartupTimeoutElapsed(startTime, endTime) {
        return endTime - startTime > this.startupTimeout.get(node_duration_1.TemporalUnit.MILLISECONDS);
    }
}
exports.HostPortWaitStrategy = HostPortWaitStrategy;
