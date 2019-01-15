export type Time = number;

export interface Clock {
  getTime(): Time;
}

export class SystemClock implements Clock {
  public getTime(): Time {
    return Date.now();
  }
}
