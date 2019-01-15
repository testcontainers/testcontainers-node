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
const clock_1 = require("./clock");
class AbstractRetryStrategy {
    constructor(clock = new clock_1.SystemClock()) {
        this.clock = clock;
    }
    hasTimedOut(timeout, startTime) {
        return this.clock.getTime() - startTime > timeout.get(node_duration_1.TemporalUnit.MILLISECONDS);
    }
    wait(duration) {
        return new Promise(resolve => setTimeout(resolve, duration.get(node_duration_1.TemporalUnit.MILLISECONDS)));
    }
}
class IntervalRetryStrategy extends AbstractRetryStrategy {
    constructor(interval) {
        super();
        this.interval = interval;
    }
    retryUntil(fn, predicate, onTimeout, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = this.clock.getTime();
            let result = yield fn();
            while (!predicate(result)) {
                if (this.hasTimedOut(timeout, startTime)) {
                    return onTimeout();
                }
                yield this.wait(this.interval);
                result = yield fn();
            }
            return result;
        });
    }
}
exports.IntervalRetryStrategy = IntervalRetryStrategy;
