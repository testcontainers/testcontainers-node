export type Time = number;

export interface Clock {
    getTime(): Time;
}

export class SystemClock implements Clock {
    public getTime(): Time {
        return Date.now();
    }
}

export class RotatingClock implements Clock {
    private timeIndex = 0;

    constructor(private readonly times: Time[]) {}

    public getTime(): Time {
        return this.times[this.timeIndex++];
    }
}
