export interface OutlineBlock {
  id: string
  content: string
  parentId: string | null
  blockOrder: number
  isCollapsed?: boolean
}

export type CursorPosition = 'start' | 'end' | 'firstLine' | 'lastLine'

export interface EditorState {
  blocks: OutlineBlock[]
  editingBlockId: string | null
  collapsedIds: Set<string>
  cursorOffset?: number
  cursorPosition?: CursorPosition
  savedCursorX?: number
}

export interface OutlineEditorProps {
  initialBlocks?: OutlineBlock[]
  onBlocksChange?: (blocks: OutlineBlock[]) => void
  onBlockUpdate?: (blockId: string, content: string) => Promise<void>
  onBlockCreate?: (parentId: string | null, order: number, content?: string) => Promise<OutlineBlock>
  onBlockDelete?: (blockId: string) => Promise<void>
  onBlockMove?: (blockId: string, newParentId: string | null, newOrder: number) => Promise<void>
}
