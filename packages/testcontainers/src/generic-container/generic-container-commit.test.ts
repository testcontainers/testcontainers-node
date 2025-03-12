import { RandomUuid } from "../common";
import { deleteImageByName, getImageInfo, getImageLabelsByName } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer commit", { timeout: 180_000 }, () => {
  const imageName = "cristianrgreco/testcontainer";
  const imageVersion = "1.1.14";

  it("should commit container changes to a new image", async () => {
    const testContent = "test content";
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const testAuthor = "test-author";
    const testComment = "test-comment";

    // Start original container and make a change
    const container = await new GenericContainer(`${imageName}:${imageVersion}`)
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();

    // Make a change to the container
    await container.exec(["sh", "-c", `echo '${testContent}' > /test-file.txt`]);

    // Commit the changes to a new image
    await container.commit({
      repo: imageName,
      tag: newImageTag,
      author: testAuthor,
      comment: testComment,
    });

    // Verify image author and comment are set
    const imageInfo = await getImageInfo(`${imageName}:${newImageTag}`);
    expect(imageInfo.Author).toBe(testAuthor);
    expect(imageInfo.Comment).toBe(testComment);

    // Start a new container from the committed image
    const newContainer = await new GenericContainer(`${imageName}:${newImageTag}`)
      .withName(`container-${new RandomUuid().nextUuid()}`)
      .withExposedPorts(8080)
      .start();

    // Verify the changes exist in the new container
    const result = await newContainer.exec(["cat", "/test-file.txt"]);
    expect(result.output.trim()).toBe(testContent);

    // Cleanup
    await container.stop();
    await newContainer.stop();
    await deleteImageByName(`${imageName}:${newImageTag}`);
  });
});
