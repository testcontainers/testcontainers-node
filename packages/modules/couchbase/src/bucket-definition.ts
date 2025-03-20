export class BucketDefinition {
  private flushEnabled = false;
  private queryPrimaryIndex = true;
  private quota = 100;
  private numOfReplicas = 0;

  constructor(private readonly name: string) {}

  withReplicas(numOfReplicas: number) {
    const minThreshold = 0;
    const maxThreshold = 3;

    if (numOfReplicas < minThreshold || numOfReplicas > maxThreshold) {
      throw new Error("The number of replicas must be between 0 and 3 (inclusive)");
    }
    this.numOfReplicas = numOfReplicas;
    return this;
  }

  withFlushEnabled(flushEnabled: boolean) {
    this.flushEnabled = flushEnabled;
    return this;
  }

  withQuota(quota: number) {
    this.quota = quota;
    return this;
  }

  withPrimaryIndex(create: boolean) {
    this.queryPrimaryIndex = create;
    return this;
  }

  getName() {
    return this.name;
  }

  hasFlushEnabled() {
    return this.flushEnabled;
  }

  hasPrimaryIndex() {
    return this.queryPrimaryIndex;
  }

  getQuota() {
    return this.quota;
  }

  getNumOfReplicas() {
    return this.numOfReplicas;
  }
}
