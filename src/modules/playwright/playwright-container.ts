import { GenericContainer } from "../../generic-container/generic-container";

export class PlaywrightContainer extends GenericContainer {
  constructor(image = "") {
    super(image);
  }
}
