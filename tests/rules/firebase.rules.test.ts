import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-roastplus-rules';
const OWN_UID = 'user_alice';
const OTHER_UID = 'user_bob';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

let testEnv: RulesTestEnvironment;

function readRules(fileName: string) {
  return readFileSync(resolve(process.cwd(), fileName), 'utf8');
}

function firestoreFor(uid?: string) {
  return uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore();
}

function storageFor(uid?: string) {
  return uid ? testEnv.authenticatedContext(uid).storage() : testEnv.unauthenticatedContext().storage();
}

function putStorageObject(uid: string | undefined, objectPath: string, bytes: Uint8Array, contentType: string) {
  return Promise.resolve(storageFor(uid).ref(objectPath).put(bytes, { contentType }));
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readRules('firestore.rules'),
    },
    storage: {
      rules: readRules('storage.rules'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore rules', () => {
  describe('users/{uid}', () => {
    it('allows only the signed-in owner to read and write their user document', async () => {
      const ownerDoc = firestoreFor(OWN_UID).doc(`users/${OWN_UID}`);
      const otherWriteDoc = firestoreFor(OTHER_UID).doc(`users/${OWN_UID}`);
      const anonymousDoc = firestoreFor().doc(`users/${OWN_UID}`);

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set({ roastSchedules: [] }));

      await assertSucceeds(ownerDoc.set({ roastSchedules: [] }));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherWriteDoc.get());
      await assertFails(otherWriteDoc.set({ roastSchedules: [] }));
    });
  });

  describe('defectBeans', () => {
    it('allows signed-in reads and denies all client writes', async () => {
      const signedInDoc = firestoreFor(OWN_UID).doc('defectBeans/quaker');
      const anonymousDoc = firestoreFor().doc('defectBeans/quaker');

      await assertSucceeds(signedInDoc.get());
      await assertFails(anonymousDoc.get());
      await assertFails(signedInDoc.set({ name: 'Quaker' }));
      await assertFails(anonymousDoc.set({ name: 'Quaker' }));
    });
  });

  describe('users/{uid}/assignmentDays/{date}', () => {
    it('allows only the signed-in owner to read and write assignment subcollection documents', async () => {
      const path = `users/${OWN_UID}/assignmentDays/2026-05-23`;
      const ownerDoc = firestoreFor(OWN_UID).doc(path);
      const otherDoc = firestoreFor(OTHER_UID).doc(path);
      const anonymousDoc = firestoreFor().doc(path);

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set({ date: '2026-05-23', assignments: [] }));

      await assertSucceeds(ownerDoc.set({ date: '2026-05-23', assignments: [] }));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherDoc.get());
      await assertFails(otherDoc.set({ date: '2026-05-23', assignments: [] }));
    });
  });

  describe('users/{uid}/productionRecords/{month}', () => {
    it('allows only the signed-in owner to read and write the month document', async () => {
      const path = `users/${OWN_UID}/productionRecords/2026-08`;
      const ownerDoc = firestoreFor(OWN_UID).doc(path);
      const otherDoc = firestoreFor(OTHER_UID).doc(path);
      const anonymousDoc = firestoreFor().doc(path);
      const monthDoc = {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [
          { beanName: 'ブラジル', ratioPercent: 80 },
          { beanName: 'グアテマラ', ratioPercent: 20 },
        ],
      };

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set(monthDoc));

      await assertSucceeds(ownerDoc.set(monthDoc));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherDoc.get());
      await assertFails(otherDoc.set(monthDoc));
    });

    it('allows only the signed-in owner to read and write handpick/roast/package subcollection entries', async () => {
      const handpickPath = `users/${OWN_UID}/productionRecords/2026-08/handpickEntries/entry_1`;
      const roastPath = `users/${OWN_UID}/productionRecords/2026-08/roastEntries/entry_1`;
      const packagePath = `users/${OWN_UID}/productionRecords/2026-08/packageEntries/entry_1`;

      const handpickEntry = {
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
      };
      const roastEntry = {
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      };
      const packageEntry = {
        workDate: '2026-08-01',
        teamA: { goodCount: 100, defectiveCount: 2 },
        teamB: { goodCount: 120, defectiveCount: 3 },
      };

      // ハンドピック: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(handpickPath).get());
      await assertFails(firestoreFor().doc(handpickPath).set(handpickEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(handpickPath).set(handpickEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(handpickPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(handpickPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(handpickPath).set(handpickEntry));

      // 焙煎: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(roastPath).set(roastEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(roastPath).set(roastEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(roastPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(roastPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(roastPath).set(roastEntry));

      // パッケージ: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(packagePath).set(packageEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(packagePath).set(packageEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(packagePath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(packagePath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(packagePath).set(packageEntry));
    });
  });
});

describe('Storage rules', () => {
  it('allows only the owner to upload allowed defect bean images', async () => {
    const path = `defect-beans/${OWN_UID}/bean_1/allowed.png`;
    const imageBytes = new Uint8Array([1, 2, 3]);

    await assertFails(putStorageObject(undefined, path, imageBytes, 'image/png'));
    await assertSucceeds(putStorageObject(OWN_UID, path, imageBytes, 'image/png'));
    await assertFails(putStorageObject(OTHER_UID, path, imageBytes, 'image/png'));
  });

  it('allows only the owner to read defect bean images', async () => {
    const path = `defect-beans/${OWN_UID}/bean_1/readable.png`;
    const imageBytes = new Uint8Array([1, 2, 3]);

    await assertSucceeds(putStorageObject(OWN_UID, path, imageBytes, 'image/png'));

    await assertSucceeds(storageFor(OWN_UID).ref(path).getMetadata());
    await assertFails(storageFor(OTHER_UID).ref(path).getMetadata());
    await assertFails(storageFor().ref(path).getMetadata());
  });

  it('denies unsupported content types', async () => {
    const path = `defect-beans/${OWN_UID}/bean_1/not-image.txt`;

    await assertFails(putStorageObject(OWN_UID, path, new Uint8Array([1]), 'text/plain'));
  });

  it('denies images larger than the rules size limit', async () => {
    const path = `defect-beans/${OWN_UID}/bean_1/too-large.png`;
    const oversizedImageBytes = new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1);

    await assertFails(putStorageObject(OWN_UID, path, oversizedImageBytes, 'image/png'));
  });
});
