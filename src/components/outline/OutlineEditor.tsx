import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { OutlineBlock, CursorPosition, OutlineEditorProps } from './types'
import { OutlineItem } from './OutlineItem'
import { useCursorNavigation } from './useCursorNavigation'

const DEFAULT_BLOCKS: OutlineBlock[] = [
  {
    id: '1',
    content: '项目概述',
    parentId: null,
    blockOrder: 0,
  },
  {
    id: '2',
    content: '这是一个大纲笔记应用\n支持无限层级嵌套',
    parentId: '1',
    blockOrder: 0,
  },
  {
    id: '3',
    content: '核心功能',
    parentId: null,
    blockOrder: 1,
  },
  {
    id: '4',
    content: '树形结构展示',
    parentId: '3',
    blockOrder: 0,
  },
  {
    id: '5',
    content: '键盘导航',
    parentId: '3',
    blockOrder: 1,
  },
  {
    id: '6',
    content: '无感编辑体验',
    parentId: '3',
    blockOrder: 2,
  },
  {
    id: '7',
    content: '技术实现',
    parentId: null,
    blockOrder: 2,
  },
  {
    id: '8',
    content: 'React 18',
    parentId: '7',
    blockOrder: 0,
  },
  {
    id: '9',
    content: 'TypeScript',
    parentId: '7',
    blockOrder: 1,
  },
  {
    id: '10',
    content: 'Tailwind CSS',
    parentId: '7',
    blockOrder: 2,
  },
]

export function OutlineEditor({
  initialBlocks,
  onBlocksChange,
  onBlockUpdate,
  onBlockCreate,
  onBlockDelete,
  onBlockMove,
}: OutlineEditorProps): React.ReactElement {
  const [blocks, setBlocks] = useState<OutlineBlock[]>(initialBlocks || DEFAULT_BLOCKS)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [cursorOffset, setCursorOffset] = useState<number | undefined>()
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | undefined>()
  const [savedCursorX, setSavedCursorX] = useState<number | undefined>()

  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      saveTimerRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const tree = useMemo(() => {
    return buildBlockTree(blocks)
  }, [blocks])

  const flatBlocks = useMemo(() => {
    return flattenBlocks(tree, collapsedIds)
  }, [tree, collapsedIds])

  const blockDepths = useMemo(() => {
    return calculateDepths(blocks)
  }, [blocks])

  const handleEditStart = useCallback((blockId: string, offset?: number) => {
    setEditingBlockId(blockId)
    setCursorOffset(offset)
    setCursorPosition(undefined)
    setSavedCursorX(undefined)
  }, [])

  const handleContentChange = useCallback((blockId: string, content: string) => {
    setBlocks(prev => {
      const newBlocks = prev.map(b =>
        b.id === blockId ? { ...b, content } : b
      )
      onBlocksChange?.(newBlocks)
      return newBlocks
    })

    const timer = saveTimerRef.current.get(blockId)
    if (timer) clearTimeout(timer)

    const newTimer = setTimeout(() => {
      onBlockUpdate?.(blockId, content)
    }, 300)
    saveTimerRef.current.set(blockId, newTimer)
  }, [onBlocksChange, onBlockUpdate])

  const handleNavigate = useCallback((blockId: string, position: CursorPosition, x?: number) => {
    setEditingBlockId(blockId)
    setCursorOffset(undefined)
    setCursorPosition(position)
    setSavedCursorX(x)
  }, [])

  const handleSplit = useCallback(async (blockId: string, beforeContent: string, _offset: number) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const afterContent = block.content.slice(beforeContent.length)

    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, content: beforeContent } : b
    ))

    const newBlock: OutlineBlock = {
      id: `block-${Date.now()}`,
      content: afterContent,
      parentId: block.parentId,
      blockOrder: block.blockOrder + 1,
    }

    setBlocks(prev => {
      const siblings = prev.filter(b => b.parentId === block.parentId)
      const updatedSiblings = siblings.map(s => {
        if (s.parentId === block.parentId && s.blockOrder > block.blockOrder) {
          return { ...s, blockOrder: s.blockOrder + 1 }
        }
        return s
      })

      const newBlocks = [...prev.filter(b => b.parentId !== block.parentId), ...updatedSiblings, newBlock]
      onBlocksChange?.(newBlocks)
      return newBlocks
    })

    if (onBlockCreate) {
      try {
        const createdBlock = await onBlockCreate(block.parentId, block.blockOrder + 1, afterContent)
        setBlocks(prev => prev.map(b =>
          b.id === newBlock.id ? createdBlock : b
        ))
      } catch (error) {
        console.error('创建 block 失败:', error)
      }
    }

    setEditingBlockId(newBlock.id)
    setCursorOffset(undefined)
    setCursorPosition('start')
    setSavedCursorX(undefined)
  }, [blocks, onBlockCreate, onBlocksChange])

  const handleDelete = useCallback(async (blockId: string) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== blockId)
      onBlocksChange?.(newBlocks)
      return newBlocks
    })

    if (onBlockDelete) {
      try {
        await onBlockDelete(blockId)
      } catch (error) {
        console.error('删除 block 失败:', error)
      }
    }
  }, [onBlockDelete, onBlocksChange])

  const handleIndent = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const siblings = blocks.filter(b => b.parentId === block.parentId)
    const currentIndex = siblings.findIndex(s => s.id === blockId)
    if (currentIndex === 0) return

    const prevSibling = siblings[currentIndex - 1]
    if (!prevSibling) return

    const newParentId = prevSibling.id
    const newOrder = blocks.filter(b => b.parentId === newParentId).length

    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, parentId: newParentId, blockOrder: newOrder } : b
    ))

    if (onBlockMove) {
      try {
        await onBlockMove(blockId, newParentId, newOrder)
      } catch (error) {
        console.error('缩进失败:', error)
      }
    }
  }, [blocks, onBlockMove])

  const handleUnindent = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block || !block.parentId) return

    const parent = blocks.find(b => b.id === block.parentId)
    if (!parent) return

    const newParentId = parent.parentId
    const siblingsAtNewLevel = blocks.filter(b => b.parentId === newParentId && b.blockOrder > parent.blockOrder)
    const newOrder = parent.blockOrder + 1

    setBlocks(prev => {
      const newBlocks = prev.map(b => {
        if (b.id === blockId) {
          return { ...b, parentId: newParentId, blockOrder: newOrder }
        }
        if (b.parentId === newParentId && b.blockOrder >= newOrder) {
          return { ...b, blockOrder: b.blockOrder + 1 }
        }
        return b
      })
      onBlocksChange?.(newBlocks)
      return newBlocks
    })

    if (onBlockMove) {
      try {
        await onBlockMove(blockId, newParentId, newOrder)
      } catch (error) {
        console.error('取消缩进失败:', error)
      }
    }
  }, [blocks, onBlockMove, onBlocksChange])

  const handleToggleCollapse = useCallback((blockId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }, [])

  const { handleKeyDown } = useCursorNavigation({
    flatBlocks,
    collapsedIds,
    onNavigate: handleNavigate,
    onSplit: handleSplit,
    onDelete: handleDelete,
    onIndent: handleIndent,
    onUnindent: handleUnindent,
    onToggleCollapse: handleToggleCollapse,
  })

  const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent, blockId: string) => {
    handleKeyDown(e, blockId)
  }, [handleKeyDown])

  return (
    <div className="w-full min-h-[200px]">
      {flatBlocks.map(block => (
        <OutlineItem
          key={block.id}
          block={block}
          depth={blockDepths.get(block.id) || 0}
          isEditing={editingBlockId === block.id}
          isCollapsed={collapsedIds.has(block.id)}
          hasChildren={tree.has(block.id) && tree.get(block.id)!.length > 0}
          cursorOffset={editingBlockId === block.id ? cursorOffset : undefined}
          cursorPosition={editingBlockId === block.id ? cursorPosition : undefined}
          savedCursorX={editingBlockId === block.id ? savedCursorX : undefined}
          onEditStart={handleEditStart}
          onContentChange={handleContentChange}
          onKeyDown={handleKeyDownWrapper}
          onToggleCollapse={handleToggleCollapse}
        />
      ))}
    </div>
  )
}

function buildBlockTree(blocks: OutlineBlock[]): Map<string | null, OutlineBlock[]> {
  const tree = new Map<string | null, OutlineBlock[]>()

  for (const block of blocks) {
    const children = tree.get(block.parentId) || []
    children.push(block)
    tree.set(block.parentId, children)
  }

  for (const [, children] of tree) {
    children.sort((a, b) => a.blockOrder - b.blockOrder)
  }

  return tree
}

function flattenBlocks(
  tree: Map<string | null, OutlineBlock[]>,
  collapsedIds: Set<string>
): OutlineBlock[] {
  const result: OutlineBlock[] = []

  const traverse = (parentId: string | null): void => {
    const children = tree.get(parentId)
    if (!children) return

    for (const child of children) {
      result.push(child)

      if (!collapsedIds.has(child.id)) {
        traverse(child.id)
      }
    }
  }

  traverse(null)
  return result
}

function calculateDepths(blocks: OutlineBlock[]): Map<string, number> {
  const depths = new Map<string, number>()
  const blockMap = new Map(blocks.map(b => [b.id, b]))

  const getDepth = (blockId: string): number => {
    if (depths.has(blockId)) {
      return depths.get(blockId)!
    }

    const block = blockMap.get(blockId)
    if (!block || !block.parentId) {
      depths.set(blockId, 0)
      return 0
    }

    const parentDepth = getDepth(block.parentId)
    const depth = parentDepth + 1
    depths.set(blockId, depth)
    return depth
  }

  for (const block of blocks) {
    getDepth(block.id)
  }

  return depths
}
