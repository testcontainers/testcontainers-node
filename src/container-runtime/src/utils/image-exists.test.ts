// import Dockerode from "dockerode";
// import { DockerImageName } from "../../../docker-image-name";
//
// const mockImageInspect = jest.fn();
// jest.mock(
//   "dockerode",
//   () =>
//     function () {
//       return {
//         getImage: () => ({
//           inspect: mockImageInspect,
//         }),
//       };
//     }
// );
//
// afterEach(() => {
//   jest.resetModules();
// });
//
// test("returns true when image exists", async () => {
//   const { imageExists } = await import("./image-exists");
//   mockImageInspect.mockResolvedValue({});
//
//   const imageName = DockerImageName.fromString("imageName");
//   const result = await imageExists(new Dockerode(), imageName);
//
//   expect(result).toBe(true);
// });
//
// test("returns previous result from cache", async () => {
//   const { imageExists } = await import("./image-exists");
//   mockImageInspect.mockResolvedValue({});
//
//   const imageName = DockerImageName.fromString("imageName");
//   await imageExists(new Dockerode(), imageName);
//   const result = await imageExists(new Dockerode(), imageName);
//
//   expect(result).toBe(true);
//   expect(mockImageInspect).toHaveBeenCalledTimes(1);
// });
//
// test("returns false when image inspect fails because image does not exist", async () => {
//   const { imageExists } = await import("./image-exists");
//   mockImageInspect.mockRejectedValue(new Error("no such image"));
//
//   const imageName = DockerImageName.fromString("imageName");
//   const result = await imageExists(new Dockerode(), imageName);
//
//   expect(result).toBe(false);
// });
//
// test("throws when unable to inspect image", async () => {
//   const { imageExists } = await import("./image-exists");
//   mockImageInspect.mockRejectedValue(new Error("unknown error"));
//
//   const imageName = DockerImageName.fromString("imageName");
//   await expect(() => imageExists(new Dockerode(), imageName)).rejects.toThrowError("unknown error");
// });
