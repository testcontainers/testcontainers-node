import fs from "fs";

export interface FileHelper {
  exists(path: string): boolean;
}

export class RealFileHelper implements FileHelper {
  public exists(path: string): boolean {
    return fs.existsSync(path);
  }
}

export class FakeFileHelper implements FileHelper {
  constructor(private readonly internalExists: boolean) {}

  public exists(path: string): boolean {
    return this.internalExists;
  }
}
