import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'
import type { Block } from '../types/block'

interface EditorProps {
  docId: string
}

export function Editor({ docId }: EditorProps): React.ReactElement {
  const [block, setBlock] = useState<Block | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载数据
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const blocks = await apiClient.getBlocks(docId)
        if (blocks.length > 0) {
          setBlock(blocks[0])
        } else {
          const newBlock = await apiClient.createBlock({
            docId,
            content: '',
          })
          setBlock(newBlock)
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [docId])

  const debouncedSave = (content: string): void => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      if (!block) return

      setSaveStatus('saving')
      apiClient
        .updateBlock(block.id, { content })
        .then(() => {
          setSaveStatus('saved')
        })
        .catch((error) => {
          console.error('保存失败:', error)
          setSaveStatus('unsaved')
        })
    }, 1000)
  }

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: block?.content || '',
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved')
      const markdown = editor.getMarkdown()
      debouncedSave(markdown)
    },
  })

  // 当 block 数据加载完成后，更新编辑器内容
  useEffect(() => {
    if (editor && block) {
      editor.commands.setContent(block.content)
    }
  }, [editor, block])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 保存状态指示器 */}
      <div className="absolute top-0 right-0 flex items-center gap-2 text-sm">
        {saveStatus === 'saving' && <span className="text-blue-600">保存中...</span>}
        {saveStatus === 'saved' && <span className="text-green-600">已保存</span>}
        {saveStatus === 'unsaved' && <span className="text-orange-500">未保存</span>}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
