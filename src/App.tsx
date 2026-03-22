import React from 'react'
import { OutlineEditor } from './components/outline/OutlineEditor'
import { mockBlocks } from './data/mock'
import './App.css'

function App(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">LinkFlow - 大纲编辑器</h1>
        <p className="text-sm text-gray-500 mt-1">点击任意位置编辑 | 方向键导航 | Tab 缩进 | Enter 拆分</p>
      </header>
      <main className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full box-border">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <OutlineEditor initialBlocks={mockBlocks} />
        </div>
      </main>
    </div>
  )
}

export default App
