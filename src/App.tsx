import {
  Children,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  Suspense,
  isValidElement,
  lazy,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import {
  Printer,
  RotateCcw,
  RotateCw,
  Upload,
  X,
} from 'lucide-react'
import './App.css'

const MarkdownEditor = lazy(() => import('./MarkdownEditor'))

export type Rotation = 'none' | 'clockwise' | 'counterclockwise'
export type RotatableKind = 'image' | 'mermaid'

type RotationMap = Record<string, Rotation>
type FontChoice = 'system' | 'serif' | 'mono'
type HeadingStyle = 'rule' | 'plain' | 'accent'
type StylePresetId = 'standard' | 'business' | 'classic' | 'compact' | 'custom'
type SavedStylePresetId = Exclude<StylePresetId, 'custom'>
type StyleVars = CSSProperties & Record<`--${string}`, string>

type DocumentStyleSettings = {
  presetId: StylePresetId
  bodyFont: FontChoice
  headingFont: FontChoice
  bodySize: number
  lineHeight: number
  headingStyle: HeadingStyle
  accentColor: string
  h1Size: number
  h2Size: number
  h3Size: number
  h4Size: number
  h5Size: number
}

type PaginatedItem = {
  height: number
  html: string
  isHeading: boolean
}

type RotatableBlockProps = {
  kind: RotatableKind
  id: string
  children: ReactNode
  rotation: Rotation
  onRotationChange: (rotation: Rotation) => void
}

type MarkdownNode = {
  type?: string
  children?: MarkdownNode[]
  [key: string]: unknown
}

const STORAGE_MARKDOWN = 'md2pdf:markdown'
const STORAGE_FILE_NAME = 'md2pdf:fileName'
const STORAGE_ROTATIONS = 'md2pdf:rotations'
const STORAGE_DOCUMENT_STYLE = 'md2pdf:documentStyle'
const APP_TAGLINE = 'オンブラウザで動くmarkdownをpdf印刷するアプリ'

const FONT_OPTIONS: Array<{ id: FontChoice; label: string }> = [
  { id: 'system', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
]

const FONT_STACKS: Record<FontChoice, string> = {
  system: 'var(--sans)',
  serif: 'var(--serif)',
  mono: 'var(--mono)',
}

const DEFAULT_ACCENT_COLOR = '#0f766e'

const ACCENT_COLORS = [
  { label: 'Teal', value: '#0f766e' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Slate', value: '#475569' },
]

const HEADING_STYLE_OPTIONS: Array<{ id: HeadingStyle; label: string }> = [
  { id: 'rule', label: '罫線' },
  { id: 'accent', label: 'アクセント' },
  { id: 'plain', label: 'なし' },
]

const STYLE_PRESETS: Record<
  SavedStylePresetId,
  DocumentStyleSettings & { presetId: SavedStylePresetId; label: string }
> = {
  standard: {
    presetId: 'standard',
    label: '標準',
    bodyFont: 'serif',
    headingFont: 'system',
    bodySize: 11.5,
    lineHeight: 1.65,
    headingStyle: 'rule',
    accentColor: DEFAULT_ACCENT_COLOR,
    h1Size: 25,
    h2Size: 17,
    h3Size: 13.5,
    h4Size: 12,
    h5Size: 10.5,
  },
  business: {
    presetId: 'business',
    label: '業務',
    bodyFont: 'system',
    headingFont: 'system',
    bodySize: 10.5,
    lineHeight: 1.55,
    headingStyle: 'accent',
    accentColor: '#2563eb',
    h1Size: 22,
    h2Size: 15,
    h3Size: 12.5,
    h4Size: 11,
    h5Size: 10,
  },
  classic: {
    presetId: 'classic',
    label: '論文',
    bodyFont: 'serif',
    headingFont: 'serif',
    bodySize: 11,
    lineHeight: 1.75,
    headingStyle: 'plain',
    accentColor: '#475569',
    h1Size: 24,
    h2Size: 16,
    h3Size: 13,
    h4Size: 11.5,
    h5Size: 10.5,
  },
  compact: {
    presetId: 'compact',
    label: 'コンパクト',
    bodyFont: 'system',
    headingFont: 'system',
    bodySize: 9.8,
    lineHeight: 1.42,
    headingStyle: 'rule',
    accentColor: '#d97706',
    h1Size: 19,
    h2Size: 13,
    h3Size: 11.5,
    h4Size: 10.5,
    h5Size: 9.8,
  },
}

const PRESET_IDS = Object.keys(STYLE_PRESETS) as SavedStylePresetId[]
const DEFAULT_DOCUMENT_STYLE = getPresetSettings('standard')

const SAMPLE_MARKDOWN = `# Markdown to PDF サンプル

この文書はPDF化の確認用サンプルです。本文、表、画像、Mermaidを含んだレイアウト確認に使います。

## Mermaid

\`\`\`mermaid
flowchart LR
  A[Markdown入力] --> B{コードブロック検出}
  B -->|mermaid| C[SVGとして描画]
  B -->|画像| D[画像ブロック化]
  C --> E[ページ内で分割しない]
  D --> E
  E --> F[ブラウザ印刷でPDF保存]
\`\`\`

## 横長画像

![横長のサンプル画像](/sample-wide.svg)

## 表とチェックリスト

| 項目 | 状態 |
| --- | --- |
| Mermaid表示 | 完了 |
| 画像の改ページ制御 | CSSで制御 |
| 要素ごとの回転 | プレビュー上のボタンで指定 |

- [x] Markdownを貼り付ける
- [x] .mdファイルを読み込む
- [x] PDF出力前にプレビューする
`

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
  flowchart: {
    curve: 'basis',
    htmlLabels: true,
  },
  sequence: {
    diagramMarginX: 0,
    diagramMarginY: 0,
  },
})

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [markdown, setMarkdown] = useState(readStoredMarkdown)
  const [fileName, setFileName] = useState(readStoredFileName)
  const [rotations, setRotations] = useState<RotationMap>(readStoredRotations)
  const [documentStyle, setDocumentStyle] = useState<DocumentStyleSettings>(
    readStoredDocumentStyle,
  )
  const [pagesHtml, setPagesHtml] = useState<string[]>([])

  useEffect(() => {
    localStorage.setItem(STORAGE_MARKDOWN, markdown)
  }, [markdown])

  useEffect(() => {
    localStorage.setItem(STORAGE_FILE_NAME, fileName)
  }, [fileName])

  useEffect(() => {
    localStorage.setItem(STORAGE_ROTATIONS, JSON.stringify(rotations))
  }, [rotations])

  useEffect(() => {
    localStorage.setItem(STORAGE_DOCUMENT_STYLE, JSON.stringify(documentStyle))
  }, [documentStyle])

  const documentStyleVars = useMemo(
    () => createDocumentStyleVars(documentStyle),
    [documentStyle],
  )

  const setElementRotation = useCallback((id: string, rotation: Rotation) => {
    setRotations((current) => {
      if (rotation === 'none') {
        const next = { ...current }
        delete next[id]
        return next
      }

      return {
        ...current,
        [id]: rotation,
      }
    })
  }, [])

  const paginatePreview = useCallback(() => {
    const source = measureRef.current

    if (!source) {
      return
    }

    const pageHeight = source.clientHeight
    const children = Array.from(source.children)

    if (!pageHeight || children.length === 0) {
      setPagesHtml((current) => (current.length === 1 && current[0] === '' ? current : ['']))
      return
    }

    const nextPages: string[] = []
    let currentPage: PaginatedItem[] = []
    let currentHeight = 0

    for (const child of children) {
      const childHeight = getElementOuterHeight(child)
      const wouldOverflow =
        currentPage.length > 0 && currentHeight + childHeight > pageHeight + 0.5

      if (wouldOverflow) {
        const carriedHeading = getCarriedHeading(currentPage)

        if (currentPage.length > 0) {
          nextPages.push(currentPage.map((item) => item.html).join(''))
        }

        currentPage = carriedHeading ? [carriedHeading] : []
        currentHeight = carriedHeading ? carriedHeading.height : 0
      }

      const childItem = createPaginatedItem(child, pageHeight - currentHeight)
      currentPage.push(childItem)
      currentHeight += childItem.height
    }

    if (currentPage.length > 0) {
      nextPages.push(currentPage.map((item) => item.html).join(''))
    }

    setPagesHtml((current) =>
      areStringArraysEqual(current, nextPages) ? current : nextPages,
    )
  }, [])

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(paginatePreview)
    return () => window.cancelAnimationFrame(frameId)
  }, [documentStyle, markdown, paginatePreview, rotations])

  useEffect(() => {
    const source = measureRef.current

    if (!source) {
      return
    }

    let frameId = 0
    const schedulePagination = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(paginatePreview)
    }

    const mutationObserver = new MutationObserver(schedulePagination)
    mutationObserver.observe(source, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })

    const resizeObserver = new ResizeObserver(schedulePagination)
    resizeObserver.observe(source)

    schedulePagination()

    return () => {
      window.cancelAnimationFrame(frameId)
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [paginatePreview])

  const markdownComponents = useMemo<Components>(() => {
    return {
      img({ node, src = '', alt = '', ...props }) {
        void node
        const id = `image-${hashString(`${src}|${alt}`)}`

        return (
          <RotatableBlock
            kind="image"
            id={id}
            rotation={rotations[id] ?? 'none'}
            onRotationChange={(rotation) => setElementRotation(id, rotation)}
          >
            <img src={src} alt={alt} loading="lazy" {...props} />
          </RotatableBlock>
        )
      },
      code({ node, className, children, ...props }) {
        void node
        const language = getLanguage(className)
        const code = String(children).replace(/\n$/, '')

        if (language === 'mermaid') {
          const id = `mermaid-${hashString(code)}`

          return (
            <MermaidBlock
              id={id}
              chart={code}
              rotation={rotations[id] ?? 'none'}
              onRotationChange={(rotation) => setElementRotation(id, rotation)}
            />
          )
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      },
      pre({ node, children, ...props }) {
        void node
        const child = Children.toArray(children)[0]

        if (isMermaidElement(child)) {
          return <>{children}</>
        }

        return (
          <pre className="markdown-code" {...props}>
            {children}
          </pre>
        )
      },
    }
  }, [rotations, setElementRotation])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setMarkdown(String(reader.result ?? ''))
      setFileName(file.name)
      setRotations({})
    })
    reader.readAsText(file)
    event.target.value = ''
  }

  const handlePrint = () => {
    window.requestAnimationFrame(() => window.print())
  }

  const handleSampleRestore = () => {
    setMarkdown(SAMPLE_MARKDOWN)
    setFileName('sample.md')
    setRotations({})
  }

  const handleStylePresetChange = (presetId: SavedStylePresetId) => {
    setDocumentStyle(getPresetSettings(presetId))
  }

  const handleStyleChange = (
    changes: Partial<Omit<DocumentStyleSettings, 'presetId'>>,
  ) => {
    setDocumentStyle((current) => ({
      ...current,
      ...changes,
      presetId: 'custom',
    }))
  }

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    const button = target.closest<HTMLButtonElement>(
      'button[data-block-id][data-rotation-action]',
    )

    if (!button || button.disabled) {
      return
    }

    const blockId = button.dataset.blockId
    const rotation = button.dataset.rotationAction

    if (!blockId || !isRotation(rotation)) {
      return
    }

    setElementRotation(blockId, rotation)
  }

  const renderedPages = pagesHtml.length > 0 ? pagesHtml : ['']

  return (
    <main className="app-shell">
      <header className="app-toolbar no-print">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <img src="/favicon.svg" alt="" />
          </span>
          <div>
            <h1>md2pdf</h1>
            <p>{APP_TAGLINE}</p>
          </div>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={handleSampleRestore}
          >
            <RotateCcw size={18} />
            サンプル
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            .md読み込み
          </button>
          <button type="button" className="primary-button" onClick={handlePrint}>
            <Printer size={18} />
            PDFプレビュー / 出力
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileChange}
        />
      </header>

      <section className="workspace">
        <aside className="editor-panel no-print" aria-label="Markdown editor">
          <div className="panel-heading">
            <h2>Markdown</h2>
            <span>{markdown.length.toLocaleString()} chars</span>
          </div>
          <StyleControls
            settings={documentStyle}
            onPresetChange={handleStylePresetChange}
            onChange={handleStyleChange}
          />
          <Suspense
            fallback={
              <div className="markdown-editor-shell">
                <div className="editor-loading">Editor loading...</div>
              </div>
            }
          >
            <MarkdownEditor value={markdown} onChange={setMarkdown} />
          </Suspense>
        </aside>

        <section className="preview-panel" aria-label="PDF preview">
          <div className="preview-heading no-print">
            <h2>Preview</h2>
            <span>
              {renderedPages.length.toLocaleString()} page
              {renderedPages.length === 1 ? '' : 's'} / A4 portrait
            </span>
          </div>
          <div className="preview-canvas" onClick={handlePreviewClick}>
            <div className="preview-pages document-surface" style={documentStyleVars}>
              {renderedPages.map((pageHtml, index) => (
                <article
                  className="pdf-page"
                  data-page-number={index + 1}
                  key={`${index}-${pageHtml.length}`}
                >
                  <div
                    className="pdf-content"
                    dangerouslySetInnerHTML={{ __html: pageHtml }}
                  />
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>

      <div
        className="pagination-measure document-surface no-print"
        style={documentStyleVars}
        aria-hidden="true"
      >
        <div ref={measureRef} className="measure-page pdf-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, unwrapStandaloneImages]}
            components={markdownComponents}
            urlTransform={markdownUrlTransform}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </main>
  )
}

type StyleControlsProps = {
  settings: DocumentStyleSettings
  onPresetChange: (presetId: SavedStylePresetId) => void
  onChange: (changes: Partial<Omit<DocumentStyleSettings, 'presetId'>>) => void
}

function StyleControls({
  settings,
  onPresetChange,
  onChange,
}: StyleControlsProps) {
  return (
    <section className="style-panel" aria-label="Document style">
      <div className="style-presets" role="group" aria-label="Style presets">
        {PRESET_IDS.map((presetId) => (
          <button
            type="button"
            className={settings.presetId === presetId ? 'is-active' : ''}
            key={presetId}
            onClick={() => onPresetChange(presetId)}
          >
            {STYLE_PRESETS[presetId].label}
          </button>
        ))}
      </div>

      <div className="style-grid">
        <label>
          <span>本文</span>
          <select
            value={settings.bodyFont}
            onChange={(event) =>
              onChange({ bodyFont: event.target.value as FontChoice })
            }
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>見出し</span>
          <select
            value={settings.headingFont}
            onChange={(event) =>
              onChange({ headingFont: event.target.value as FontChoice })
            }
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>本文pt</span>
          <input
            type="number"
            min="8"
            max="16"
            step="0.1"
            value={settings.bodySize}
            onChange={(event) =>
              onChange({ bodySize: clampNumber(event.target.value, 8, 16) })
            }
          />
        </label>
        <label>
          <span>行間</span>
          <input
            type="number"
            min="1.1"
            max="2.2"
            step="0.05"
            value={settings.lineHeight}
            onChange={(event) =>
              onChange({ lineHeight: clampNumber(event.target.value, 1.1, 2.2) })
            }
          />
        </label>
      </div>

      <div className="heading-style-control">
        <span>見出し線</span>
        <div className="heading-style-options">
          {HEADING_STYLE_OPTIONS.map((option) => (
            <button
              type="button"
              className={settings.headingStyle === option.id ? 'is-active' : ''}
              key={option.id}
              onClick={() => onChange({ headingStyle: option.id })}
            >
              <span
                className={`heading-style-sample sample-${option.id}`}
                style={
                  option.id === 'accent'
                    ? ({ '--sample-accent': settings.accentColor } as StyleVars)
                    : undefined
                }
                aria-hidden="true"
              >
                <span></span>
                <span></span>
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {settings.headingStyle === 'accent' ? (
        <div className="accent-color-control">
          <span>アクセント色</span>
          <div className="accent-color-row">
            {ACCENT_COLORS.map((color) => (
              <button
                type="button"
                className={
                  colorsMatch(settings.accentColor, color.value) ? 'is-active' : ''
                }
                key={color.value}
                onClick={() => onChange({ accentColor: color.value })}
                aria-label={`アクセント色 ${color.label}`}
                title={color.label}
              >
                <span
                  style={{ backgroundColor: color.value }}
                  aria-hidden="true"
                ></span>
              </button>
            ))}
            <label className="custom-color">
              <span>自由</span>
              <input
                type="color"
                value={settings.accentColor}
                onChange={(event) => onChange({ accentColor: event.target.value })}
                aria-label="自由なアクセント色"
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="heading-size-grid" aria-label="Heading sizes">
        {(
          [
            ['h1', 'h1Size', settings.h1Size, 16, 34],
            ['h2', 'h2Size', settings.h2Size, 12, 26],
            ['h3', 'h3Size', settings.h3Size, 10, 22],
            ['h4', 'h4Size', settings.h4Size, 9, 18],
            ['h5', 'h5Size', settings.h5Size, 8, 16],
          ] as const
        ).map(([label, key, value, min, max]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type="number"
              min={min}
              max={max}
              step="0.5"
              value={value}
              onChange={(event) =>
                onChange({ [key]: clampNumber(event.target.value, min, max) })
              }
            />
          </label>
        ))}
      </div>
    </section>
  )
}

function RotatableBlock({
  kind,
  id,
  children,
  rotation,
  onRotationChange,
}: RotatableBlockProps) {
  const isRotated = rotation !== 'none'
  const label = kind === 'image' ? '画像' : 'Mermaid'

  return (
    <figure
      className={`rotatable-block ${isRotated ? 'is-rotated' : ''}`}
      data-kind={kind}
      data-rotation={rotation}
      data-block-id={id}
    >
      <figcaption
        className="block-controls no-print"
        aria-label={`${label}の操作`}
      >
        <div className="control-buttons">
          <button
            type="button"
            data-block-id={id}
            data-rotation-action="clockwise"
            className={rotation === 'clockwise' ? 'is-active' : ''}
            onClick={() => onRotationChange('clockwise')}
            aria-label={`${label}を右に90度回転`}
            title={`${label}を右に90度回転`}
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            data-block-id={id}
            data-rotation-action="counterclockwise"
            className={rotation === 'counterclockwise' ? 'is-active' : ''}
            onClick={() => onRotationChange('counterclockwise')}
            aria-label={`${label}を左に90度回転`}
            title={`${label}を左に90度回転`}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            data-block-id={id}
            data-rotation-action="none"
            disabled={rotation === 'none'}
            onClick={() => onRotationChange('none')}
            aria-label={`${label}の回転を解除`}
            title={`${label}の回転を解除`}
          >
            <X size={16} />
          </button>
        </div>
      </figcaption>
      <div className="rotatable-frame">
        <div className="rotatable-content">{children}</div>
      </div>
    </figure>
  )
}

type MermaidBlockProps = {
  id: string
  chart: string
  rotation: Rotation
  onRotationChange: (rotation: Rotation) => void
}

function MermaidBlock({
  id,
  chart,
  rotation,
  onRotationChange,
}: MermaidBlockProps) {
  const reactId = useId()
  const renderId = useMemo(
    () => `${id}-${reactId}`.replace(/[^a-zA-Z0-9_-]/g, ''),
    [id, reactId],
  )
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    mermaid
      .render(renderId, chart)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      })
      .catch((renderError: unknown) => {
        if (!cancelled) {
          setSvg('')
          setError(
            renderError instanceof Error
              ? renderError.message
              : 'Mermaidの描画に失敗しました。',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [chart, renderId])

  return (
    <RotatableBlock
      kind="mermaid"
      id={id}
      rotation={rotation}
      onRotationChange={onRotationChange}
    >
      <div className="mermaid-output" data-mermaid-block="true">
        {error ? (
          <pre className="mermaid-error">{error}</pre>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="mermaid-loading">Rendering Mermaid...</div>
        )}
      </div>
    </RotatableBlock>
  )
}

function readStoredMarkdown() {
  return localStorage.getItem(STORAGE_MARKDOWN) ?? SAMPLE_MARKDOWN
}

function readStoredFileName() {
  return localStorage.getItem(STORAGE_FILE_NAME) ?? 'sample.md'
}

function readStoredRotations(): RotationMap {
  try {
    const stored = localStorage.getItem(STORAGE_ROTATIONS)
    if (!stored) {
      return {}
    }

    const parsed = JSON.parse(stored) as RotationMap
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, Rotation] => {
        return (
          entry[1] === 'none' ||
          entry[1] === 'clockwise' ||
          entry[1] === 'counterclockwise'
        )
      }),
    )
  } catch {
    return {}
  }
}

function getPresetSettings(presetId: SavedStylePresetId): DocumentStyleSettings {
  const preset = STYLE_PRESETS[presetId]

  return {
    presetId: preset.presetId,
    bodyFont: preset.bodyFont,
    headingFont: preset.headingFont,
    bodySize: preset.bodySize,
    lineHeight: preset.lineHeight,
    headingStyle: preset.headingStyle,
    accentColor: preset.accentColor,
    h1Size: preset.h1Size,
    h2Size: preset.h2Size,
    h3Size: preset.h3Size,
    h4Size: preset.h4Size,
    h5Size: preset.h5Size,
  }
}

function readStoredDocumentStyle(): DocumentStyleSettings {
  try {
    const stored = localStorage.getItem(STORAGE_DOCUMENT_STYLE)

    if (!stored) {
      return DEFAULT_DOCUMENT_STYLE
    }

    return sanitizeDocumentStyle(JSON.parse(stored))
  } catch {
    return DEFAULT_DOCUMENT_STYLE
  }
}

function sanitizeDocumentStyle(value: unknown): DocumentStyleSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_DOCUMENT_STYLE
  }

  const candidate = value as Partial<DocumentStyleSettings>
  const presetId: StylePresetId =
    candidate.presetId && candidate.presetId in STYLE_PRESETS
      ? candidate.presetId
      : 'custom'

  return {
    presetId,
    bodyFont: isFontChoice(candidate.bodyFont)
      ? candidate.bodyFont
      : DEFAULT_DOCUMENT_STYLE.bodyFont,
    headingFont: isFontChoice(candidate.headingFont)
      ? candidate.headingFont
      : DEFAULT_DOCUMENT_STYLE.headingFont,
    bodySize: clampNumber(candidate.bodySize, 8, 16, DEFAULT_DOCUMENT_STYLE.bodySize),
    lineHeight: clampNumber(
      candidate.lineHeight,
      1.1,
      2.2,
      DEFAULT_DOCUMENT_STYLE.lineHeight,
    ),
    headingStyle: isHeadingStyle(candidate.headingStyle)
      ? candidate.headingStyle
      : DEFAULT_DOCUMENT_STYLE.headingStyle,
    accentColor: sanitizeHexColor(
      candidate.accentColor,
      DEFAULT_DOCUMENT_STYLE.accentColor,
    ),
    h1Size: clampNumber(candidate.h1Size, 16, 34, DEFAULT_DOCUMENT_STYLE.h1Size),
    h2Size: clampNumber(candidate.h2Size, 12, 26, DEFAULT_DOCUMENT_STYLE.h2Size),
    h3Size: clampNumber(candidate.h3Size, 10, 22, DEFAULT_DOCUMENT_STYLE.h3Size),
    h4Size: clampNumber(candidate.h4Size, 9, 18, DEFAULT_DOCUMENT_STYLE.h4Size),
    h5Size: clampNumber(candidate.h5Size, 8, 16, DEFAULT_DOCUMENT_STYLE.h5Size),
  }
}

function createDocumentStyleVars(settings: DocumentStyleSettings): StyleVars {
  const usesRule = settings.headingStyle === 'rule'
  const usesAccent = settings.headingStyle === 'accent'
  const accentColor = sanitizeHexColor(settings.accentColor, DEFAULT_ACCENT_COLOR)

  return {
    '--body-font-family': FONT_STACKS[settings.bodyFont],
    '--heading-font-family': FONT_STACKS[settings.headingFont],
    '--body-font-size': `${settings.bodySize}pt`,
    '--body-line-height': String(settings.lineHeight),
    '--h1-size': `${settings.h1Size}pt`,
    '--h2-size': `${settings.h2Size}pt`,
    '--h3-size': `${settings.h3Size}pt`,
    '--h4-size': `${settings.h4Size}pt`,
    '--h5-size': `${settings.h5Size}pt`,
    '--h1-rule-width': usesRule ? '2px' : '0px',
    '--h2-accent-width': usesAccent ? '4px' : '0px',
    '--h2-accent-padding': usesAccent ? '10px' : '0px',
    '--heading-color': usesAccent ? accentColor : '#172033',
    '--heading-rule-color': usesAccent ? accentColor : '#172033',
  }
}

function getElementOuterHeight(element: Element) {
  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const marginTop = Number.parseFloat(styles.marginTop) || 0
  const marginBottom = Number.parseFloat(styles.marginBottom) || 0

  return rect.height + marginTop + marginBottom
}

function createPaginatedItem(element: Element, availableHeight: number): PaginatedItem {
  const height = getElementOuterHeight(element)
  let itemHeight = height
  let html = element.outerHTML

  if (isRotatedBlock(element) && availableHeight > 0) {
    const margins = getElementVerticalMargins(element)
    const frameHeight = Math.max(0, Math.min(height - margins, availableHeight - margins))

    if (frameHeight > 0) {
      const clone = element.cloneNode(true) as Element
      setStyleProperty(clone, '--rotated-frame-height', `${frameHeight}px`)
      html = clone.outerHTML
      itemHeight = frameHeight + margins
    }
  }

  return {
    height: itemHeight,
    html,
    isHeading: isHeadingElement(element),
  }
}

function getElementVerticalMargins(element: Element) {
  const styles = window.getComputedStyle(element)
  const marginTop = Number.parseFloat(styles.marginTop) || 0
  const marginBottom = Number.parseFloat(styles.marginBottom) || 0

  return marginTop + marginBottom
}

function getCarriedHeading(items: PaginatedItem[]) {
  const lastItem = items.at(-1)

  if (!lastItem?.isHeading) {
    return undefined
  }

  return items.pop()
}

function isHeadingElement(element: Element) {
  return /^H[1-6]$/.test(element.tagName)
}

function isRotatedBlock(element: Element): element is HTMLElement {
  return (
    element.classList.contains('rotatable-block') &&
    element.getAttribute('data-rotation') !== null &&
    element.getAttribute('data-rotation') !== 'none'
  )
}

function setStyleProperty(element: Element, property: `--${string}`, value: string) {
  if (element instanceof HTMLElement) {
    element.style.setProperty(property, value)
    return
  }

  const currentStyle = element.getAttribute('style')
  const separator = currentStyle && currentStyle.trim().endsWith(';') ? ' ' : '; '
  element.setAttribute('style', `${currentStyle ?? ''}${separator}${property}: ${value};`)
}

function areStringArraysEqual(first: string[], second: string[]) {
  if (first.length !== second.length) {
    return false
  }

  return first.every((value, index) => value === second[index])
}

function clampNumber(
  value: string | number | undefined,
  min: number,
  max: number,
  fallback = min,
) {
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function isRotation(value: unknown): value is Rotation {
  return (
    value === 'none' ||
    value === 'clockwise' ||
    value === 'counterclockwise'
  )
}

function isFontChoice(value: unknown): value is FontChoice {
  return value === 'system' || value === 'serif' || value === 'mono'
}

function isHeadingStyle(value: unknown): value is HeadingStyle {
  return value === 'rule' || value === 'plain' || value === 'accent'
}

function sanitizeHexColor(value: unknown, fallback: string) {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase()
  }

  return fallback
}

function colorsMatch(first: string, second: string) {
  return first.toLowerCase() === second.toLowerCase()
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

function getLanguage(className?: string) {
  return /language-([a-z0-9_-]+)/i.exec(className ?? '')?.[1]?.toLowerCase()
}

function isMermaidElement(value: ReactNode): value is ReactElement {
  return isValidElement(value) && value.type === MermaidBlock
}

function unwrapStandaloneImages() {
  return (tree: MarkdownNode) => {
    visitMarkdownNode(tree)
  }
}

function visitMarkdownNode(node: MarkdownNode) {
  if (!node.children) {
    return
  }

  node.children = node.children.flatMap((child) => {
    visitMarkdownNode(child)

    if (
      child.type === 'paragraph' &&
      child.children?.length === 1 &&
      child.children[0]?.type === 'image'
    ) {
      return child.children
    }

    return [child]
  })
}

function markdownUrlTransform(url: string, key: string) {
  if (key === 'src' && /^data:image\//i.test(url)) {
    return url
  }

  return defaultUrlTransform(url)
}

export default App
