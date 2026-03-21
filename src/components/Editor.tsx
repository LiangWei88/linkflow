import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

export function Editor({ docId }: { docId: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // 自动保存
      console.log('Content updated:', editor.getJSON());
      console.log('Markdown:', editor.getMarkdown());
    },
  });
  
  return <EditorContent editor={editor} />;
}
