import Dockerode from "dockerode";
import { ImageName } from "../image-name";

const mockImageInspect = vi.fn();
vi.mock("dockerode", () => {
  return {
    default: vi.fn(() => ({
      getImage: () => ({
        inspect: mockImageInspect,
      }),
    })),
  };
});

afterEach(() => {
  vi.resetModules();
});

test("returns true when image exists", async () => {
  const { imageExists } = await import("./image-exists");
  mockImageInspect.mockResolvedValue({});

  const imageName = ImageName.fromString("imageName");
  const result = await imageExists(new Dockerode(), imageName);

  expect(result).toBe(true);
});

test("returns previous result from cache", async () => {
  const { imageExists } = await import("./image-exists");
  mockImageInspect.mockResolvedValue({});

  const imageName = ImageName.fromString("imageName");
  await imageExists(new Dockerode(), imageName);
  const result = await imageExists(new Dockerode(), imageName);

  expect(result).toBe(true);
  expect(mockImageInspect).toHaveBeenCalledTimes(1);
});

test("returns false when image inspect fails because image does not exist", async () => {
  const { imageExists } = await import("./image-exists");
  mockImageInspect.mockRejectedValue(new Error("no such image"));

  const imageName = ImageName.fromString("imageName");
  const result = await imageExists(new Dockerode(), imageName);

  expect(result).toBe(false);
});

test("throws when unable to inspect image", async () => {
  const { imageExists } = await import("./image-exists");
  mockImageInspect.mockRejectedValue(new Error("unknown error"));

  const imageName = ImageName.fromString("imageName");
  await expect(() => imageExists(new Dockerode(), imageName)).rejects.toThrowError("unknown error");
});
