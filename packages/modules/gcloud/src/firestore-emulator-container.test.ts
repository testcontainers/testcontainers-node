import * as admin from "firebase-admin";
import { FirestoreEmulatorContainer, StartedFirestoreEmulatorContainer } from "./firestore-emulator-container";

describe("FirestoreEmulatorContainer", { timeout: 240_000 }, () => {
  afterEach(async () => {
    await admin.app().delete();
  });

  // firestore4 {
  it("should work using default version", async () => {
    const firestoreEmulatorContainer = await new FirestoreEmulatorContainer().start();

    await checkFirestore(firestoreEmulatorContainer);

    await firestoreEmulatorContainer.stop();
  });
  // }

  // firestore5 {
  it("should work using version 468.0.0", async () => {
    const firestoreEmulatorContainer = await new FirestoreEmulatorContainer(
      "gcr.io/google.com/cloudsdktool/google-cloud-cli:468.0.0-emulators"
    ).start();

    await checkFirestore(firestoreEmulatorContainer);

    await firestoreEmulatorContainer.stop();
  });

  // }

  async function checkFirestore(firestoreEmulatorContainer: StartedFirestoreEmulatorContainer) {
    expect(firestoreEmulatorContainer).toBeDefined();
    const testProjectId = "test-project";
    const testCollection = "test-collection";
    const testDocument = "test-doc";
    const firebaseConfig = { projectId: testProjectId };
    const firestore = admin.initializeApp(firebaseConfig).firestore();
    firestore.settings({ host: firestoreEmulatorContainer.getEmulatorEndpoint(), ssl: false });

    const docRef = firestore.collection(testCollection).doc(testDocument);
    await docRef.set({ message: "Hello, Firestore!" });

    const snapshot = await docRef.get();

    expect(snapshot.exists).toBeTruthy();
    expect(snapshot.data()).toEqual({ message: "Hello, Firestore!" });
  }
});
