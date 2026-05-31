import type { FirestoreTimestamp } from './common';

export type InventoryStatus = 'enough' | 'low' | 'out';

export type InventoryCategory = 'green-bean' | 'material' | 'consumable';

export interface InventoryItemInput {
  name: string;
  category: InventoryCategory;
  status: InventoryStatus;
  note?: string;
}

export interface InventoryItem extends InventoryItemInput {
  id: string;
  updatedBy: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}
