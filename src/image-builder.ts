import { GenericContainerBuilder } from "./generic-container-builder";
import { Uuid } from "./uuid";

export class ImageBuilder {
  public name?: string;
  public tag?: string;
  public rebuild: boolean = false;

  constructor(private readonly uuid: Uuid, private readonly parent: GenericContainerBuilder) {}

  public withName(name: string): ImageBuilder {
    this.name = name;
    return this;
  }

  public withTag(tag: string): ImageBuilder {
    this.tag = tag;
    return this;
  }

  public forceRebuild(): ImageBuilder {
    this.rebuild = true;
    return this;
  }

  public build(): GenericContainerBuilder {
    return this.parent;
  }

  public getName(): string {
    return this.name || this.uuid.nextUuid();
  }

  public getTag(): string {
    return this.tag || this.uuid.nextUuid();
  }

  public shouldForceRebuild(): boolean {
    return this.rebuild;
  }
}
