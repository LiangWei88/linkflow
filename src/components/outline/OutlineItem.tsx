import { useCallback, useRef } from 'react'
import type { OutlineBlock, CursorPosition } from './types'
import { BlockEditor, isCursorAtStart, isCursorAtEnd, isCursorAtFirstLine, isCursorAtLastLine, getCursorX } from './BlockEditor'
import { getClickOffset } from './cursor'

interface OutlineItemProps {
  block: OutlineBlock
  depth: number
  isEditing: boolean
  isCollapsed: boolean
  hasChildren: boolean
  cursorOffset?: number
  cursorPosition?: CursorPosition
  savedCursorX?: number
  onEditStart: (blockId: string, offset?: number) => void
  onContentChange: (blockId: string, content: string) => void
  onKeyDown: (e: React.KeyboardEvent, blockId: string) => void
  onToggleCollapse: (blockId: string) => void
}

export function OutlineItem({
  block,
  depth,
  isEditing,
  isCollapsed,
  hasChildren,
  cursorOffset,
  cursorPosition,
  savedCursorX,
  onEditStart,
  onContentChange,
  onKeyDown,
  onToggleCollapse,
}: OutlineItemProps): React.ReactElement {
  const itemRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!itemRef.current) return

    const contentEl = itemRef.current.querySelector('[data-content]') as HTMLElement
    if (!contentEl) return

    const offset = getClickOffset(contentEl, e.clientX, e.clientY)
    onEditStart(block.id, offset)
  }, [block.id, onEditStart])

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCollapse(block.id)
  }, [block.id, onToggleCollapse])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    onKeyDown(e, block.id)
  }, [onKeyDown, block.id])

  return (
    <div
      ref={itemRef}
      className="group"
      style={{ marginLeft: depth * 20 }}
    >
      <div
        className={`flex items-start gap-1 py-1 px-2 rounded cursor-text hover:bg-gray-50 ${isEditing ? 'bg-transparent' : ''}`}
        onClick={handleClick}
      >
        <button
          onClick={handleToggleCollapse}
          className={`flex-shrink-0 w-4 h-4 mt-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-transform ${isCollapsed ? '-rotate-90' : ''} ${hasChildren ? 'visible' : 'invisible'}`}
          tabIndex={-1}
        >
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
        </button>

        <div
          data-content
          className="flex-1 min-w-0"
        >
          {isEditing ? (
            <BlockEditor
              content={block.content}
              onChange={(content) => onContentChange(block.id, content)}
              onKeyDown={handleKeyDown}
              cursorOffset={cursorOffset}
              cursorPosition={cursorPosition}
              savedCursorX={savedCursorX}
            />
          ) : (
            <div className="min-h-[1.5em] whitespace-pre-wrap break-words text-gray-900 leading-relaxed">
              {block.content || <span className="text-gray-400">输入内容...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { isCursorAtStart, isCursorAtEnd, isCursorAtFirstLine, isCursorAtLastLine, getCursorX }
