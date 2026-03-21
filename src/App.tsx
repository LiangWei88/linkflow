import React from 'react'
import { Editor } from './components/Editor'
import './App.css'

function App(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">LinkFlow</h1>
      </header>
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full box-border">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <Editor docId="test-doc" />
        </div>
      </main>
    </div>
  )
}

export default App
