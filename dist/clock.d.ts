export declare type Time = number;
export interface Clock {
    getTime(): Time;
}
export declare class SystemClock implements Clock {
    getTime(): Time;
}
export declare class RotatingClock implements Clock {
    private readonly times;
    private timeIndex;
    constructor(times: Time[]);
    getTime(): Time;
}
