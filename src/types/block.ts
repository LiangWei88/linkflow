export interface Block {
  id: string;
  docId: string;
  content: string;
  blockOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockCreate {
  docId: string;
  content: string;
  blockOrder?: number;
}

export interface BlockUpdate {
  content?: string;
  blockOrder?: number;
}
