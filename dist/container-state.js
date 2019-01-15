"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContainerState {
    constructor(portBindings) {
        this.portBindings = portBindings;
    }
    getHostPorts() {
        return this.portBindings.getHostPorts();
    }
    getInternalPorts() {
        return this.portBindings.getInternalPorts();
    }
}
exports.ContainerState = ContainerState;
