"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SystemClock {
    getTime() {
        return Date.now();
    }
}
exports.SystemClock = SystemClock;
class ChainedClock {
    constructor(times) {
        this.times = times;
        this.timeIndex = 0;
    }
    getTime() {
        return this.times[this.timeIndex++];
    }
}
exports.ChainedClock = ChainedClock;
