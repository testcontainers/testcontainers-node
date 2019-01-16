"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
class DebugLogger {
    constructor() {
        this.logger = debug_1.default("testcontainers");
    }
    debug(message) {
        this.logger(message);
    }
    info(message) {
        this.logger(message);
    }
    warn(message) {
        this.logger(message);
    }
    error(message) {
        this.logger(message);
    }
}
exports.DebugLogger = DebugLogger;
