import { useEffect, useRef, useCallback, useState } from 'react'
import type { CursorPosition } from './types'
import {
  setCursorAtOffset,
  setCursorAtStart,
  setCursorAtEnd,
  setCursorAtX,
  isCursorAtStart,
  isCursorAtEnd,
  isCursorAtFirstLine,
  isCursorAtLastLine,
  getCursorX,
} from './cursor'

interface BlockEditorProps {
  content: string
  onChange: (content: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  cursorOffset?: number
  cursorPosition?: CursorPosition
  savedCursorX?: number
  placeholder?: string
}

export function BlockEditor({
  content,
  onChange,
  onKeyDown,
  cursorOffset,
  cursorPosition,
  savedCursorX,
  placeholder = '输入内容...',
}: BlockEditorProps): React.ReactElement {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true

      requestAnimationFrame(() => {
        if (!editorRef.current) return

        if (cursorOffset !== undefined) {
          setCursorAtOffset(editorRef.current, cursorOffset)
        } else if (cursorPosition) {
          if (savedCursorX !== undefined && (cursorPosition === 'firstLine' || cursorPosition === 'lastLine')) {
            setCursorAtX(editorRef.current, savedCursorX, cursorPosition)
          } else if (cursorPosition === 'start') {
            setCursorAtStart(editorRef.current)
          } else if (cursorPosition === 'end') {
            setCursorAtEnd(editorRef.current)
          }
        } else {
          setCursorAtStart(editorRef.current)
        }
      })
    }
  }, [cursorOffset, cursorPosition, savedCursorX])

  useEffect(() => {
    if (editorRef.current && editorRef.current !== document.activeElement) {
      editorRef.current.focus()
    }
  }, [])

  const handleInput = useCallback(() => {
    if (isComposing) return
    if (!editorRef.current) return

    const newContent = editorRef.current.innerText
    onChange(newContent)
  }, [onChange, isComposing])

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
    if (editorRef.current) {
      onChange(editorRef.current.innerText)
    }
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isComposing) return

    const editor = editorRef.current
    if (!editor) return

    onKeyDown(e)
  }, [onKeyDown, isComposing])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  useEffect(() => {
    if (!editorRef.current) return

    const currentContent = editorRef.current.innerText
    if (currentContent !== content) {
      const selection = window.getSelection()
      let savedRange: Range | null = null

      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
        savedRange = selection.getRangeAt(0).cloneRange()
      }

      editorRef.current.innerText = content

      if (savedRange && editorRef.current.contains(savedRange.startContainer)) {
        selection?.removeAllRanges()
        selection?.addRange(savedRange)
      }
    }
  }, [content])

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onPaste={handlePaste}
      className="outline-none min-h-[1.5em] whitespace-pre-wrap break-words text-gray-900 leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
    />
  )
}

export {
  isCursorAtStart,
  isCursorAtEnd,
  isCursorAtFirstLine,
  isCursorAtLastLine,
  getCursorX,
}
