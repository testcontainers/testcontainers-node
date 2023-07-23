export interface PullPolicy {
  shouldPull(): boolean;
}

export class DefaultPullPolicy implements PullPolicy {
  shouldPull(): boolean {
    return false;
  }
}

export class AlwaysPullPolicy implements PullPolicy {
  shouldPull(): boolean {
    return true;
  }
}
