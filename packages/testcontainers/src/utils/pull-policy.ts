export interface ImagePullPolicy {
  shouldPull(): boolean | "never";
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

class NeverPullPolicy implements ImagePullPolicy {
  public shouldPull(): "never" {
    return "never";
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

  public static neverPull(): ImagePullPolicy {
    return new NeverPullPolicy();
  }
}
