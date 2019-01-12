"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_port_1 = __importDefault(require("get-port"));
class RandomSocketClient {
    getPort() {
        return get_port_1.default();
    }
}
exports.RandomSocketClient = RandomSocketClient;
class FixedSocketClient {
    constructor(ports) {
        this.ports = ports;
        this.portIndex = 0;
    }
    getPort() {
        return Promise.resolve(this.ports[this.portIndex++]);
    }
}
exports.FixedSocketClient = FixedSocketClient;
