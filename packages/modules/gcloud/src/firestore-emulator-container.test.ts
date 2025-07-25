import admin from "firebase-admin";
import { randomUuid } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { FirestoreEmulatorContainer } from "./firestore-emulator-container";

const IMAGE = getImage(__dirname);

describe("FirestoreEmulatorContainer", { timeout: 240_000 }, () => {
  it.each([IMAGE, "gcr.io/google.com/cloudsdktool/google-cloud-cli:468.0.0-emulators"])(
    "should work with %s",
    async (image) => {
      // firestoreExample {
      const collection = "test-collection";
      const document = "test-doc";

      await using firestoreEmulatorContainer = await new FirestoreEmulatorContainer(image).start();

      const firestore = admin.initializeApp({ projectId: "test-project" }, `test-app-${randomUuid()}`).firestore();

      firestore.settings({
        host: firestoreEmulatorContainer.getEmulatorEndpoint(),
        ssl: false,
      });

      const docRef = firestore.collection(collection).doc(document);
      await docRef.set({ message: "Hello, Firestore!" });
      const snapshot = await docRef.get();

      expect(snapshot.data()).toEqual({ message: "Hello, Firestore!" });
      // }
    }
  );
});
