import type { FirestoreTimestamp } from './common';

export type InventoryStatus = 'enough' | 'low' | 'out';

export interface InventoryItemInput {
  name: string;
  status: InventoryStatus;
}

export interface InventoryItem extends InventoryItemInput {
  id: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}
