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
const logger_1 = __importDefault(require("./logger"));
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
    constructor(dockerClient, hostPortCheck, internalPortCheck) {
        super();
        this.dockerClient = dockerClient;
        this.hostPortCheck = hostPortCheck;
        this.internalPortCheck = internalPortCheck;
    }
    waitUntilReady(containerState) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([this.waitForHostPorts(containerState), this.waitForInternalPorts(containerState)]);
        });
    }
    waitForHostPorts(containerState) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const hostPort of containerState.getHostPorts()) {
                logger_1.default.debug(`Waiting for host port :${hostPort}`);
                yield this.waitForPort(hostPort, this.hostPortCheck);
            }
        });
    }
    waitForInternalPorts(containerState) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const internalPort of containerState.getInternalPorts()) {
                logger_1.default.debug(`Waiting for internal port :${internalPort}`);
                yield this.waitForPort(internalPort, this.internalPortCheck);
            }
        });
    }
    waitForPort(port, portCheck) {
        return __awaiter(this, void 0, void 0, function* () {
            const retryStrategy = new retry_strategy_1.IntervalRetryStrategy(new node_duration_1.Duration(100, node_duration_1.TemporalUnit.MILLISECONDS));
            yield retryStrategy.retryUntil(() => portCheck.isBound(port), isBound => isBound === true, () => {
                const timeout = this.startupTimeout.get(node_duration_1.TemporalUnit.MILLISECONDS);
                throw new Error(`Port :${port} not bound after ${timeout}ms`);
            }, this.startupTimeout);
        });
    }
}
exports.HostPortWaitStrategy = HostPortWaitStrategy;
