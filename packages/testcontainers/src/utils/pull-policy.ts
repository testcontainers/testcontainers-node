export interface ImagePullPolicy {
  shouldPull(): boolean;
}

class DefaultPullPolicy implements ImagePullPolicy {
  public shouldPull(): boolean {
    return false;
  }
}

class AlwaysPullPolicy implements ImagePullPolicy {
  public shouldPull(): boolean {
    return true;
  }
}

export class PullPolicy {
  public static defaultPolicy(): ImagePullPolicy {
    return new DefaultPullPolicy();
  }

  public static alwaysPull(): ImagePullPolicy {
    return new AlwaysPullPolicy();
  }
}
