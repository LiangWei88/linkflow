import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { useEffect, useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { Block } from '../types/block';

interface EditorProps {
  docId: string;
}

// 防抖函数
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function Editor({ docId }: EditorProps): JSX.Element {
  const [block, setBlock] = useState<Block | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const blocks = await apiClient.getBlocks(docId);
        if (blocks.length > 0) {
          // 使用第一个 block 的内容
          setBlock(blocks[0]);
        } else {
          // 如果没有 block，创建一个新的
          const newBlock = await apiClient.createBlock({
            docId,
            content: '',
          });
          setBlock(newBlock);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [docId]);

  // 自动保存函数
  const autoSave = useCallback(
    async (content: string) => {
      if (!block) return;
      
      setSaveStatus('saving');
      try {
        await apiClient.updateBlock(block.id, { content });
        setSaveStatus('saved');
      } catch (error) {
        console.error('保存失败:', error);
        setSaveStatus('unsaved');
      }
    },
    [block]
  );

  // 防抖保存
  const debouncedSave = useCallback(
    debounce((content: string) => autoSave(content), 1000),
    [autoSave]
  );

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: block?.content || '',
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      const markdown = editor.getMarkdown();
      debouncedSave(markdown);
    },
  });

  // 当 block 数据加载完成后，更新编辑器内容
  useEffect(() => {
    if (editor && block) {
      editor.commands.setContent(block.content);
    }
  }, [editor, block]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 保存状态指示器 */}
      <div className="absolute top-0 right-0 flex items-center gap-2 text-sm">
        {saveStatus === 'saving' && (
          <span className="text-blue-600">保存中...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-green-600">已保存</span>
        )}
        {saveStatus === 'unsaved' && (
          <span className="text-orange-500">未保存</span>
        )}
      </div>
      
      <EditorContent editor={editor} />
    </div>
  );
}
