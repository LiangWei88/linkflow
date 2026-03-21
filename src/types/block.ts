export interface Block {
  id: string;
  docId: string;
  content: string;
  parentId: string | null;
  blockOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockCreate {
  docId: string;
  content: string;
  parentId?: string | null;
  blockOrder?: number;
}

export interface BlockUpdate {
  content?: string;
  parentId?: string | null;
  blockOrder?: number;
}
