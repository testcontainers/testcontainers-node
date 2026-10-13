import { getImage } from "../../../testcontainers/src/utils/test-helper";

export const IMAGES = ["postgres:15.19-alpine", "postgres:16.15-alpine", "postgres:17.11-alpine", getImage(__dirname)];
