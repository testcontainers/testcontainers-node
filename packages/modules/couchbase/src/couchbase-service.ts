export class CouchbaseService {
  constructor(
    private identifier: string,
    private minimumQuotaMb: number
  ) {}

  static readonly KV = new CouchbaseService("kv", 256);
  static readonly QUERY = new CouchbaseService("n1ql", 0);
  static readonly SEARCH = new CouchbaseService("fts", 256);
  static readonly INDEX = new CouchbaseService("index", 256);
  static readonly ANALYTICS = new CouchbaseService("cbas", 1024);
  static readonly EVENTING = new CouchbaseService("eventing", 256);

  getIdentifier() {
    return this.identifier;
  }

  getMinimumQuotaMb() {
    return this.minimumQuotaMb;
  }

  hasQuota() {
    return this.minimumQuotaMb > 0;
  }
}
