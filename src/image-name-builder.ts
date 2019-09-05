import { GenericContainerBuilder } from "./generic-container-builder";
import { Uuid } from "./uuid";

export class ImageNameBuilder {
  public name?: string;
  public tag?: string;
  public rebuild: boolean = false;

  constructor(private readonly uuid: Uuid, private readonly parent: GenericContainerBuilder) {}

  public withName(name: string): ImageNameBuilder {
    this.name = name;
    return this;
  }

  public withTag(tag: string): ImageNameBuilder {
    this.tag = tag;
    return this;
  }

  public forceRebuild(): ImageNameBuilder {
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
