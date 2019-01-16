"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class DockerodeContainer {
    constructor(container) {
        this.container = container;
    }
    getId() {
        return this.container.id;
    }
    start() {
        return this.container.start();
    }
    stop() {
        return this.container.stop();
    }
    remove() {
        return this.container.remove();
    }
    exec(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return new DockerodeExec(yield this.container.exec(options));
        });
    }
    inspect() {
        return __awaiter(this, void 0, void 0, function* () {
            const inspectResult = yield this.container.inspect();
            const ports = inspectResult.NetworkSettings.Ports;
            const internalPorts = Object.keys(ports).map(port => Number(port.split("/")[0]));
            const hostPorts = Object.values(ports)
                .filter(portsArray => portsArray !== null)
                .map(portsArray => Number(portsArray[0].HostPort));
            return { internalPorts, hostPorts };
        });
    }
}
exports.DockerodeContainer = DockerodeContainer;
class DockerodeExec {
    constructor(exec) {
        this.exec = exec;
    }
    start() {
        return new Promise((resolve, reject) => {
            this.exec.start((err, stream) => {
                if (err) {
                    return reject(err);
                }
                return resolve(stream);
            });
        });
    }
    inspect() {
        return __awaiter(this, void 0, void 0, function* () {
            const inspectResult = yield this.exec.inspect();
            return { exitCode: inspectResult.ExitCode };
        });
    }
}
