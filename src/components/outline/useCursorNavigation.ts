import { useCallback } from 'react'
import type { OutlineBlock, CursorPosition } from './types'
import { isCursorAtStart, isCursorAtEnd, isCursorAtFirstLine, isCursorAtLastLine, getCursorX } from './OutlineItem'

interface UseCursorNavigationProps {
  flatBlocks: OutlineBlock[]
  collapsedIds: Set<string>
  onNavigate: (blockId: string, position: CursorPosition, savedCursorX?: number) => void
  onSplit: (blockId: string, content: string, offset: number) => void
  onDelete: (blockId: string) => void
  onIndent: (blockId: string) => void
  onUnindent: (blockId: string) => void
  onToggleCollapse: (blockId: string) => void
}

export function useCursorNavigation({
  flatBlocks,
  collapsedIds,
  onNavigate,
  onSplit,
  onDelete,
  onIndent,
  onUnindent,
  onToggleCollapse,
}: UseCursorNavigationProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentBlockId: string) => {
    const currentIndex = flatBlocks.findIndex(b => b.id === currentBlockId)
    if (currentIndex === -1) return

    const currentBlock = flatBlocks[currentIndex]

    switch (e.key) {
      case 'ArrowUp': {
        if (!isCursorAtFirstLine(e.currentTarget as HTMLElement)) return

        e.preventDefault()
        const prevBlock = flatBlocks[currentIndex - 1]
        if (prevBlock) {
          const savedX = getCursorX()
          onNavigate(prevBlock.id, 'lastLine', savedX)
        }
        break
      }

      case 'ArrowDown': {
        if (!isCursorAtLastLine(e.currentTarget as HTMLElement)) return

        e.preventDefault()
        const nextBlock = flatBlocks[currentIndex + 1]
        if (nextBlock) {
          const savedX = getCursorX()
          onNavigate(nextBlock.id, 'firstLine', savedX)
        }
        break
      }

      case 'ArrowLeft': {
        if (!isCursorAtStart(e.currentTarget as HTMLElement)) return

        e.preventDefault()
        const prevBlock = flatBlocks[currentIndex - 1]
        if (prevBlock) {
          onNavigate(prevBlock.id, 'end')
        }
        break
      }

      case 'ArrowRight': {
        if (!isCursorAtEnd(e.currentTarget as HTMLElement)) return

        e.preventDefault()
        const nextBlock = flatBlocks[currentIndex + 1]
        if (nextBlock) {
          onNavigate(nextBlock.id, 'start')
        }
        break
      }

      case 'Tab': {
        e.preventDefault()
        if (e.shiftKey) {
          onUnindent(currentBlockId)
        } else {
          onIndent(currentBlockId)
        }
        break
      }

      case 'Enter': {
        e.preventDefault()
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        const editorEl = e.currentTarget as HTMLElement
        const offset = getTextOffset(editorEl, range.startContainer, range.startOffset)

        const content = currentBlock.content
        const beforeContent = content.slice(0, offset)
        const afterContent = content.slice(offset)

        onSplit(currentBlockId, beforeContent, offset)
        break
      }

      case 'Backspace': {
        if (currentBlock.content.length > 0) return

        e.preventDefault()
        const prevBlock = flatBlocks[currentIndex - 1]
        if (prevBlock) {
          onDelete(currentBlockId)
          onNavigate(prevBlock.id, 'end')
        }
        break
      }

      case 'Delete': {
        if (currentBlock.content.length > 0) return

        e.preventDefault()
        const nextBlock = flatBlocks[currentIndex + 1]
        if (nextBlock) {
          onDelete(currentBlockId)
          onNavigate(nextBlock.id, 'start')
        }
        break
      }
    }
  }, [flatBlocks, onNavigate, onSplit, onDelete, onIndent, onUnindent])

  return { handleKeyDown }
}

function getTextOffset(element: HTMLElement, startContainer: Node, startOffset: number): number {
  let offset = 0

  const walkNodes = (node: Node): boolean => {
    if (node === startContainer) {
      offset += startOffset
      return true
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length || 0
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName === 'BR') {
        offset += 1
      } else {
        for (const child of Array.from(node.childNodes)) {
          if (walkNodes(child)) return true
        }
      }
    }

    return false
  }

  walkNodes(element)
  return offset
}
