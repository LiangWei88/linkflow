export function setCursorAtOffset(element: HTMLElement, offset: number): void {
  const range = document.createRange()
  const selection = window.getSelection()
  if (!selection) return

  let currentOffset = 0
  let found = false

  const walkNodes = (node: Node): void => {
    if (found) return

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0
      if (currentOffset + textLength >= offset) {
        range.setStart(node, offset - currentOffset)
        range.collapse(true)
        found = true
      } else {
        currentOffset += textLength
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName === 'BR') {
        if (currentOffset === offset) {
          range.setStartBefore(node)
          range.collapse(true)
          found = true
        }
        currentOffset += 1
      } else {
        for (const child of Array.from(node.childNodes)) {
          walkNodes(child)
          if (found) break
        }
      }
    }
  }

  walkNodes(element)

  if (!found) {
    setCursorAtEnd(element)
    return
  }

  selection.removeAllRanges()
  selection.addRange(range)
}

export function setCursorAtStart(element: HTMLElement): void {
  const range = document.createRange()
  const selection = window.getSelection()
  if (!selection) return

  let targetNode: Node | null = null

  if (element.firstChild) {
    if (element.firstChild.nodeType === Node.TEXT_NODE) {
      targetNode = element.firstChild
      range.setStart(targetNode, 0)
    } else if (element.firstChild.nodeType === Node.ELEMENT_NODE) {
      targetNode = element.firstChild
      range.setStartBefore(targetNode)
    } else {
      range.setStart(element, 0)
    }
  } else {
    range.setStart(element, 0)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function setCursorAtEnd(element: HTMLElement): void {
  const range = document.createRange()
  const selection = window.getSelection()
  if (!selection) return

  if (element.lastChild) {
    if (element.lastChild.nodeType === Node.TEXT_NODE) {
      const textNode = element.lastChild as Text
      range.setStart(textNode, textNode.length)
    } else if (element.lastChild.nodeType === Node.ELEMENT_NODE && (element.lastChild as Element).tagName === 'BR') {
      range.setStartBefore(element.lastChild)
    } else {
      range.setStartAfter(element.lastChild)
    }
  } else {
    range.setStart(element, 0)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function setCursorAtX(
  element: HTMLElement,
  targetX: number,
  position: 'firstLine' | 'lastLine'
): void {
  const selection = window.getSelection()
  if (!selection) return

  const textContent = element.textContent || ''
  if (textContent.length === 0) {
    setCursorAtStart(element)
    return
  }

  const lines = getTextLines(element)
  if (lines.length === 0) {
    setCursorAtStart(element)
    return
  }

  const lineIndex = position === 'firstLine' ? 0 : lines.length - 1
  const line = lines[lineIndex]

  let bestOffset = 0
  let bestDistance = Infinity

  for (let i = 0; i <= line.text.length; i++) {
    const range = document.createRange()
    if (line.node.nodeType === Node.TEXT_NODE) {
      range.setStart(line.node, Math.min(i, line.text.length))
    } else {
      continue
    }
    range.collapse(true)

    const rects = range.getClientRects()
    if (rects.length > 0) {
      const rect = rects[0]
      const distance = Math.abs(rect.left - targetX)
      if (distance < bestDistance) {
        bestDistance = distance
        bestOffset = i
      }
    }
  }

  const range = document.createRange()
  if (line.node.nodeType === Node.TEXT_NODE) {
    range.setStart(line.node, Math.min(bestOffset, line.text.length))
  }
  range.collapse(true)

  selection.removeAllRanges()
  selection.addRange(range)
}

interface TextLine {
  text: string
  node: Node
  startOffset: number
}

function getTextLines(element: HTMLElement): TextLine[] {
  const lines: TextLine[] = []
  let currentLineText = ''
  let currentLineStart = 0
  let currentTextNode: Node | null = null

  const walkNodes = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!currentTextNode) {
        currentTextNode = node
        currentLineStart = 0
      }
      currentLineText += text
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName === 'BR') {
        if (currentTextNode && currentLineText) {
          lines.push({
            text: currentLineText,
            node: currentTextNode,
            startOffset: currentLineStart,
          })
        }
        currentLineText = ''
        currentLineStart += currentLineText.length + 1
        currentTextNode = null
      } else {
        for (const child of Array.from(node.childNodes)) {
          walkNodes(child)
        }
      }
    }
  }

  walkNodes(element)

  if (currentTextNode && currentLineText) {
    lines.push({
      text: currentLineText,
      node: currentTextNode,
      startOffset: currentLineStart,
    })
  }

  return lines
}

export function isCursorAtStart(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return false

  if (range.startOffset > 0) return false

  let node: Node | null = range.startContainer
  while (node && node !== element) {
    if (node.previousSibling) {
      if (node.previousSibling.nodeType === Node.TEXT_NODE) {
        const text = node.previousSibling.textContent || ''
        if (text.length > 0) return false
      } else if (node.previousSibling.nodeType === Node.ELEMENT_NODE) {
        const prevEl = node.previousSibling as Element
        if (prevEl.tagName !== 'BR') {
          return false
        }
      }
    }
    node = node.parentNode
  }

  return true
}

export function isCursorAtEnd(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return false

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer as Text
    if (range.startOffset < textNode.length) return false
  }

  let node: Node | null = range.startContainer
  while (node && node !== element) {
    if (node.nextSibling) {
      if (node.nextSibling.nodeType === Node.TEXT_NODE) {
        const text = node.nextSibling.textContent || ''
        if (text.length > 0) return false
      } else if (node.nextSibling.nodeType === Node.ELEMENT_NODE) {
        const nextEl = node.nextSibling as Element
        if (nextEl.tagName !== 'BR') {
          return false
        }
      }
    }
    node = node.parentNode
  }

  return true
}

export function isCursorAtFirstLine(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return false

  const cursorRect = range.getClientRects()[0]
  if (!cursorRect) return true

  const elementRect = element.getBoundingClientRect()
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 20

  return cursorRect.top - elementRect.top < lineHeight
}

export function isCursorAtLastLine(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return false

  const cursorRect = range.getClientRects()[0]
  if (!cursorRect) return true

  const elementRect = element.getBoundingClientRect()
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 20

  return elementRect.bottom - cursorRect.bottom < lineHeight
}

export function getClickOffset(
  element: HTMLElement,
  clientX: number,
  clientY: number
): number | undefined {
  let range: Range | null = null

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY)
  } else if ((document as unknown as { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } }).caretPositionFromPoint) {
    const pos = (document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } }).caretPositionFromPoint(clientX, clientY)
    range = document.createRange()
    range.setStart(pos.offsetNode, pos.offset)
  }

  if (!range || !element.contains(range.startContainer)) {
    return undefined
  }

  return getTextOffsetFromRange(element, range)
}

function getTextOffsetFromRange(element: HTMLElement, range: Range): number {
  let offset = 0
  const startNode = range.startContainer
  const startOffset = range.startOffset

  const walkNodes = (node: Node): boolean => {
    if (node === startNode) {
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

export function getCursorX(): number | undefined {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return undefined

  const range = selection.getRangeAt(0)
  const rects = range.getClientRects()

  if (rects.length > 0) {
    return rects[0].left
  }

  return undefined
}
