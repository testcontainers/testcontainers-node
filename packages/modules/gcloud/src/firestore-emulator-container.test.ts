import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUuid } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { FirestoreEmulatorContainer } from "./firestore-emulator-container";

const IMAGE = getImage(__dirname);

describe("FirestoreEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    // firestoreExample {
    await using container = await new FirestoreEmulatorContainer(IMAGE).start();

    const app = initializeApp({ projectId: "test-project" }, `test-app-${randomUuid()}`);
    const firestore = getFirestore(app);
    firestore.settings({
      host: container.getEmulatorEndpoint(),
      ssl: false,
    });

    const collection = "test-collection";
    const document = "test-doc";
    const docRef = firestore.collection(collection).doc(document);
    await docRef.set({ message: "Hello, Firestore!" });
    const snapshot = await docRef.get();

    expect(snapshot.data()).toEqual({ message: "Hello, Firestore!" });
    // }
  });
});
