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
const node_duration_1 = require("node-duration");
class AbstractRetryStrategy {
    wait(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, timeout.get(node_duration_1.TemporalUnit.MILLISECONDS)));
        });
    }
}
class SimpleRetryStrategy extends AbstractRetryStrategy {
    constructor(timeout) {
        super();
        this.timeout = timeout;
    }
    retry(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield fn();
            if (result !== undefined) {
                return result;
            }
            yield this.wait(this.timeout);
            return this.retry(fn);
        });
    }
}
exports.SimpleRetryStrategy = SimpleRetryStrategy;
