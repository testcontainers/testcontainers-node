"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContainerState {
    constructor(inspectResult) {
        this.inspectResult = inspectResult;
    }
    getHostPorts() {
        return this.inspectResult.hostPorts;
    }
    getInternalPorts() {
        return this.inspectResult.internalPorts;
    }
}
exports.ContainerState = ContainerState;
