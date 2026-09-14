export interface ImagePullPolicy {
  shouldPull(): boolean;
  neverPull?(): boolean;
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
  public neverPull(): boolean {
    return true;
  }

  public shouldPull(): boolean {
    return false;
  }
}

type PullMode = "missing" | "always" | "never";

export function resolvePullPolicy(pullPolicy: ImagePullPolicy): PullMode {
  const shouldPull = pullPolicy.shouldPull();
  if (pullPolicy.neverPull?.()) {
    if (shouldPull) {
      throw new Error("Image pull policy cannot enable both shouldPull() and neverPull()");
    }
    return "never";
  }
  return shouldPull ? "always" : "missing";
}

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
