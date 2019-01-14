"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_duration_1 = require("node-duration");
const logger_1 = __importDefault(require("./logger"));
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
    waitUntilReady(containerState) {
        logger_1.default.info("Waiting for HostPortStrategy");
        return new Promise(resolve => setTimeout(resolve, 3000));
    }
}
exports.HostPortWaitStrategy = HostPortWaitStrategy;
