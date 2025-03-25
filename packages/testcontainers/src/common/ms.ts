/**
 * Represents time interval in milliseconds.
 */
export class Ms {
  constructor(private readonly milliseconds: number) {
    if (milliseconds < 0) throw new Error("Negative interval is not supported in this context.");
  }
  public seconds(): number {
    return Math.trunc(this.milliseconds * 1e-3);
  }
  public value(): number {
    return this.milliseconds;
  }
  public nanos(): number {
    return this.milliseconds * 1e6;
  }
}
