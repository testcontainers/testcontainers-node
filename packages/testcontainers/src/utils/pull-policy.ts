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

// biome-ignore lint/complexity/noStaticOnlyClass: public API surface, kept as a class for backwards compatibility
export class PullPolicy {
  public static defaultPolicy(): ImagePullPolicy {
    return new DefaultPullPolicy();
  }

  public static alwaysPull(): ImagePullPolicy {
    return new AlwaysPullPolicy();
  }
}
