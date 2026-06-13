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

  describe('users/{uid}/productionRecords field validation', () => {
    const monthPath = `users/${OWN_UID}/productionRecords/2026-08`;
    const validMonthDoc = {
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
    };

    function ownDoc(path: string) {
      return firestoreFor(OWN_UID).doc(path);
    }

    describe('month document', () => {
      it('accepts a valid month document including timestamps', async () => {
        await assertSucceeds(ownDoc(monthPath).set({ ...validMonthDoc, createdAt: new Date(), updatedAt: new Date() }));
      });

      it('rejects unknown fields', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, extraField: 'unexpected' }));
      });

      it('rejects missing required fields', async () => {
        await assertFails(
          ownDoc(monthPath).set({
            month: validMonthDoc.month,
            greenBeanTotalGram: validMonthDoc.greenBeanTotalGram,
            powderPerPackGram: validMonthDoc.powderPerPackGram,
          })
        );
      });

      it('rejects a month field that does not match the document ID', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, month: '2026-09' }));
      });

      it('rejects an invalid month format', async () => {
        const path = `users/${OWN_UID}/productionRecords/2026-13`;
        await assertFails(ownDoc(path).set({ ...validMonthDoc, month: '2026-13' }));
      });

      it('rejects zero or negative greenBeanTotalGram', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, greenBeanTotalGram: 0 }));
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, greenBeanTotalGram: -100 }));
      });

      it('accepts the upper bound weight and rejects above it', async () => {
        await assertSucceeds(ownDoc(monthPath).set({ ...validMonthDoc, greenBeanTotalGram: 10_000_000 }));
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, greenBeanTotalGram: 10_000_001 }));
      });

      it('rejects non-numeric greenBeanTotalGram', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, greenBeanTotalGram: '30000' }));
      });

      it('rejects out-of-range powderPerPackGram', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, powderPerPackGram: 0 }));
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, powderPerPackGram: -8.5 }));
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, powderPerPackGram: 1001 }));
      });

      it('rejects empty or too many blendItems', async () => {
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, blendItems: [] }));
        const fiveItems = Array.from({ length: 5 }, (_, i) => ({ beanName: `bean${i}`, ratioPercent: 20 }));
        await assertFails(ownDoc(monthPath).set({ ...validMonthDoc, blendItems: fiveItems }));
      });

      it('rejects blend items with invalid values', async () => {
        await assertFails(
          ownDoc(monthPath).set({ ...validMonthDoc, blendItems: [{ beanName: 'ブラジル', ratioPercent: -10 }] })
        );
        await assertFails(
          ownDoc(monthPath).set({ ...validMonthDoc, blendItems: [{ beanName: 'ブラジル', ratioPercent: 101 }] })
        );
        await assertFails(
          ownDoc(monthPath).set({
            ...validMonthDoc,
            blendItems: [{ beanName: 'ブラジル', ratioPercent: 100, extra: true }],
          })
        );
        await assertFails(
          ownDoc(monthPath).set({ ...validMonthDoc, blendItems: [{ beanName: 'a'.repeat(201), ratioPercent: 100 }] })
        );
      });

      it('rejects blend ratios that do not total 100 percent', async () => {
        await assertFails(
          ownDoc(monthPath).set({
            ...validMonthDoc,
            blendItems: [
              { beanName: 'A', ratioPercent: 100 },
              { beanName: 'B', ratioPercent: 100 },
              { beanName: 'C', ratioPercent: 100 },
            ],
          })
        );
        await assertFails(
          ownDoc(monthPath).set({
            ...validMonthDoc,
            blendItems: [
              { beanName: 'A', ratioPercent: 30 },
              { beanName: 'B', ratioPercent: 30 },
            ],
          })
        );
      });

      // 既存クライアントは removeUndefinedFields が serverTimestamp() センチネルを
      // map({_methodName:'serverTimestamp'}) に変換したまま書き込んでおり、本番データも同形。
      // ルールで型を縛ると全保存が拒否されるため、createdAt/updatedAt はキーの許可のみ行う
      it('accepts legacy serverTimestamp-sentinel maps in createdAt/updatedAt', async () => {
        await assertSucceeds(
          ownDoc(monthPath).set({
            ...validMonthDoc,
            createdAt: { _methodName: 'serverTimestamp' },
            updatedAt: { _methodName: 'serverTimestamp' },
          })
        );
      });
    });

    describe('handpickEntries', () => {
      const entryPath = `${monthPath}/handpickEntries/entry_1`;
      const validEntry = {
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
      };

      it('accepts a valid entry with zero defect weight and timestamps', async () => {
        await assertSucceeds(
          ownDoc(entryPath).set({
            ...validEntry,
            defectBeanWeightGram: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );
      });

      it('rejects zero or negative greenBeanWeightGram', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, greenBeanWeightGram: 0 }));
        await assertFails(ownDoc(entryPath).set({ ...validEntry, greenBeanWeightGram: -1 }));
      });

      it('rejects negative defectBeanWeightGram', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, defectBeanWeightGram: -1 }));
      });

      it('rejects weights above the upper bound', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, greenBeanWeightGram: 10_000_001 }));
      });

      it('accepts legacy serverTimestamp-sentinel maps in createdAt/updatedAt', async () => {
        await assertSucceeds(
          ownDoc(entryPath).set({
            ...validEntry,
            createdAt: { _methodName: 'serverTimestamp' },
            updatedAt: { _methodName: 'serverTimestamp' },
          })
        );
      });

      it('rejects an unknown segment', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, segment: 'third' }));
      });

      it('rejects an invalid workDate format', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, workDate: '2026/08/01' }));
        await assertFails(ownDoc(entryPath).set({ ...validEntry, workDate: '2026-08-32' }));
      });

      it('rejects a too long beanName', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, beanName: 'a'.repeat(201) }));
      });

      it('rejects unknown fields', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, memo: 'unexpected' }));
      });
    });

    describe('roastEntries', () => {
      const entryPath = `${monthPath}/roastEntries/2026-08-01`;
      const validEntry = {
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      };

      it('accepts a valid entry with timestamps', async () => {
        await assertSucceeds(ownDoc(entryPath).set({ ...validEntry, createdAt: new Date(), updatedAt: new Date() }));
      });

      it('rejects zero or negative weights', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, beforeRoastWeightGram: 0 }));
        await assertFails(ownDoc(entryPath).set({ ...validEntry, afterRoastWeightGram: -1 }));
      });

      it('rejects afterRoastWeightGram greater than beforeRoastWeightGram', async () => {
        await assertFails(
          ownDoc(entryPath).set({ ...validEntry, beforeRoastWeightGram: 8000, afterRoastWeightGram: 8500 })
        );
      });

      it('rejects unknown fields', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, memo: 'unexpected' }));
      });
    });

    describe('packageEntries', () => {
      const entryPath = `${monthPath}/packageEntries/2026-08-01`;
      const validEntry = {
        workDate: '2026-08-01',
        teamA: { goodCount: 100, defectiveCount: 2 },
        teamB: { goodCount: 120, defectiveCount: 3 },
      };

      it('accepts a valid entry with timestamps', async () => {
        await assertSucceeds(ownDoc(entryPath).set({ ...validEntry, createdAt: new Date(), updatedAt: new Date() }));
      });

      it('rejects negative counts', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, teamA: { goodCount: -1, defectiveCount: 0 } }));
        await assertFails(ownDoc(entryPath).set({ ...validEntry, teamB: { goodCount: 0, defectiveCount: -1 } }));
      });

      it('rejects non-integer counts', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, teamA: { goodCount: 1.5, defectiveCount: 0 } }));
      });

      it('rejects unknown keys inside team counts', async () => {
        await assertFails(
          ownDoc(entryPath).set({ ...validEntry, teamA: { goodCount: 1, defectiveCount: 0, extra: 1 } })
        );
      });

      it('rejects unknown fields', async () => {
        await assertFails(ownDoc(entryPath).set({ ...validEntry, memo: 'unexpected' }));
      });
    });

    describe('structure restriction', () => {
      it('denies writes to unknown subcollections under a month document', async () => {
        await assertFails(ownDoc(`${monthPath}/unknownEntries/entry_1`).set({ anything: true }));
      });

      it('denies reads and writes deeper than entry documents', async () => {
        const path = `${monthPath}/handpickEntries/entry_1/nested/doc_1`;
        await assertFails(ownDoc(path).set({ anything: true }));
        await assertFails(ownDoc(path).get());
      });
    });

    describe('entry deletion', () => {
      it('allows only the owner to delete an entry', async () => {
        const entryPath = `${monthPath}/handpickEntries/entry_del`;
        const validEntry = {
          workDate: '2026-08-01',
          beanName: 'ブラジル',
          segment: 'first',
          greenBeanWeightGram: 10000,
          defectBeanWeightGram: 300,
        };
        await assertSucceeds(ownDoc(entryPath).set(validEntry));
        await assertFails(firestoreFor(OTHER_UID).doc(entryPath).delete());
        await assertSucceeds(ownDoc(entryPath).delete());
      });
    });
  });

  describe('users/{uid}/assignmentSettings/{settingId}', () => {
    it('allows owner access to single-level documents and denies nested paths', async () => {
      const path = `users/${OWN_UID}/assignmentSettings/shuffle`;
      await assertSucceeds(firestoreFor(OWN_UID).doc(path).set({ crossTeamShuffle: false }));
      await assertFails(firestoreFor(OTHER_UID).doc(path).get());

      const nestedPath = `users/${OWN_UID}/assignmentSettings/shuffle/nested/doc_1`;
      await assertFails(firestoreFor(OWN_UID).doc(nestedPath).set({ anything: true }));
      await assertFails(firestoreFor(OWN_UID).doc(nestedPath).get());
    });
  });

  describe('users/{uid}/_meta/{docId}', () => {
    it('allows owner access to single-level documents and denies nested paths', async () => {
      const path = `users/${OWN_UID}/_meta/serverTime`;
      await assertSucceeds(firestoreFor(OWN_UID).doc(path).set({ requestedAt: new Date() }));
      await assertFails(firestoreFor(OTHER_UID).doc(path).get());

      const nestedPath = `users/${OWN_UID}/_meta/serverTime/nested/doc_1`;
      await assertFails(firestoreFor(OWN_UID).doc(nestedPath).set({ anything: true }));
      await assertFails(firestoreFor(OWN_UID).doc(nestedPath).get());
    });
  });

  describe('inventory', () => {
    it('allows any signed-in member to read/write, denies anonymous (team-shared)', async () => {
      const item = { name: 'ドリップ袋', status: 'low' };
      const ownerDoc = firestoreFor(OWN_UID).doc('inventory/item_1');
      const otherDoc = firestoreFor(OTHER_UID).doc('inventory/item_1');
      const anonymousDoc = firestoreFor().doc('inventory/item_1');

      // 未認証は読み書きとも拒否
      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set(item));

      // 認証済みメンバーは読み書き可
      await assertSucceeds(ownerDoc.set(item));
      await assertSucceeds(ownerDoc.get());

      // 別メンバーも読み書き可（チーム共有。defectBeans と異なり全員が編集可）
      await assertSucceeds(otherDoc.get());
      await assertSucceeds(otherDoc.set({ name: 'ドリップ袋', status: 'out' }));
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
