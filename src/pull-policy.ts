export interface PullPolicy {
  shouldPull(): boolean;
}

export class DefaultPullPolicy implements PullPolicy {
  public shouldPull(): boolean {
    return false;
  }
}

export class AlwaysPullPolicy implements PullPolicy {
  public shouldPull(): boolean {
    return true;
  }
}
