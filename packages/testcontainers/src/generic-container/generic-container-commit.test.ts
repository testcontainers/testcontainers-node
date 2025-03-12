import path from "path";
import { RandomUuid } from "../common";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { deleteImageByName, getImageInfo } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer commit", { timeout: 180_000 }, () => {
  const imageName = "cristianrgreco/testcontainer";
  const imageVersion = "1.1.14";

  const fixtures = path.resolve(__dirname, "..", "..", "fixtures", "docker");

  it("should commit container changes to a new image", async () => {
    const testContent = "test content";
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const testAuthor = "test-author";
    const testComment = "test-comment";

    // Start original container and make a change
    const container = await new GenericContainer(`${imageName}:${imageVersion}`).withExposedPorts(8080).start();

    // Make a change to the container
    await container.exec(["sh", "-c", `echo '${testContent}' > /test-file.txt`]);

    // Commit the changes to a new image
    const imageId = await container.commit({
      repo: imageName,
      tag: newImageTag,
      author: testAuthor,
      comment: testComment,
    });

    // Verify image metadata is set
    const imageInfo = await getImageInfo(imageId);
    expect(imageInfo.Author).toBe(testAuthor);
    expect(imageInfo.Comment).toBe(testComment);

    // Start a new container from the committed image
    const newContainer = await new GenericContainer(imageId).withExposedPorts(8080).start();

    // Verify the changes exist in the new container
    const result = await newContainer.exec(["cat", "/test-file.txt"]);
    expect(result.output.trim()).toBe(testContent);

    // Cleanup
    await container.stop();
    await newContainer.stop();
  });

  it("should add session ID label when deleteOnExit is true", async () => {
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const container = await new GenericContainer(`${imageName}:${imageVersion}`).withExposedPorts(8080).start();

    // Commit with deleteOnExit true (default)
    const imageId = await container.commit({
      repo: imageName,
      tag: newImageTag,
    });

    // Verify session ID label is present
    const imageInfo = await getImageInfo(imageId);
    expect(imageInfo.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBeDefined();

    await container.stop();
  });

  it("should not add session ID label when deleteOnExit is false", async () => {
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const context = path.resolve(fixtures, "docker");
    const container = await GenericContainer.fromDockerfile(context).build(`${imageName}:no-delete-on-exit`, {
      deleteOnExit: false,
    });

    const startedContainer = await container.start();

    // Commit with deleteOnExit false
    const imageId = await startedContainer.commit({
      repo: imageName,
      tag: newImageTag,
      deleteOnExit: false,
    });

    // Verify session ID label is not present
    const imageInfo = await getImageInfo(imageId);
    expect(imageInfo.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBeUndefined();

    await startedContainer.stop();
    await deleteImageByName(imageId);
  });
});
