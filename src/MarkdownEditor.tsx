import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

globalThis.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}
loader.config({ monaco })

const MARKDOWN_EDITOR_THEME = 'md2pdf-markdown'
const MARKDOWN_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    ariaLabel: 'Markdown source',
    automaticLayout: true,
    cursorBlinking: 'smooth',
    fontFamily:
      '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace',
    fontSize: 14,
    folding: true,
    glyphMargin: false,
    lineHeight: 23,
    lineNumbers: 'on',
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    padding: { top: 18, bottom: 18 },
    renderLineHighlight: 'line',
    renderWhitespace: 'selection',
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
    wordWrap: 'on',
    wrappingIndent: 'same',
    scrollbar: {
      horizontalScrollbarSize: 10,
      verticalScrollbarSize: 10,
    },
  }

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <div className="markdown-editor-shell">
      <Editor
        beforeMount={prepareMarkdownEditor}
        language="markdown"
        loading={<div className="editor-loading">Editor loading...</div>}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={MARKDOWN_EDITOR_OPTIONS}
        theme={MARKDOWN_EDITOR_THEME}
        value={value}
      />
    </div>
  )
}

function prepareMarkdownEditor(monacoInstance: typeof monaco) {
  monacoInstance.editor.defineTheme(MARKDOWN_EDITOR_THEME, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.md', foreground: '0f766e', fontStyle: 'bold' },
      { token: 'string.link.md', foreground: '2563eb' },
      { token: 'emphasis.md', fontStyle: 'italic' },
      { token: 'strong.md', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#fbfcfd',
      'editor.foreground': '#172033',
      'editor.lineHighlightBackground': '#eef8f633',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#0f766e',
      'editor.selectionBackground': '#bfdbfe',
      'editor.inactiveSelectionBackground': '#dbeafe',
      'editorCursor.foreground': '#0f766e',
    },
  })
}
