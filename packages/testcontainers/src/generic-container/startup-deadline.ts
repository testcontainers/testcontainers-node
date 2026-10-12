export class StartupDeadline {
  private readonly deadline: number;

  constructor(startupTimeoutMs: number) {
    this.deadline = Date.now() + startupTimeoutMs;
  }

  public getRemainingMs(): number {
    return Math.max(this.deadline - Date.now(), 0);
  }
}
