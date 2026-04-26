import type { CSSProperties } from 'react'
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import {
  FileText,
  Palette,
  Printer,
  RotateCw,
} from 'lucide-react'

type DemoMode = 'typing' | 'diagram' | 'keep' | 'style' | 'rotate'

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1)
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const MONO =
  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace'

const MODE_LABELS: Record<DemoMode, string> = {
  typing: 'Markdownを書くだけで、右側にA4プレビュー。',
  diagram: 'Mermaidも表も、PDF向けに崩さず確認。',
  keep: '見出しと内容が離れるダサい資料とはおさらば。',
  style: 'フォント、見出し、アクセント色をすぐ調整。',
  rotate: '横長で見にくい画像や図は、回転して印刷しても見やすく。',
}

const DEMO_SHOTS = [
  { src: 'promo/demo-type-1.png', startSeconds: 0 },
  { src: 'promo/demo-type-2.png', startSeconds: 0.9 },
  { src: 'promo/demo-type-3.png', startSeconds: 1.8 },
  { src: 'promo/demo-type-4.png', startSeconds: 2.7 },
  { src: 'promo/demo-type-5.png', startSeconds: 3.7 },
  { src: 'promo/demo-type-6.png', startSeconds: 4.8 },
  { src: 'promo/demo-standard.png', startSeconds: 6 },
  { src: 'promo/demo-keep-heading.png', startSeconds: 10 },
  { src: 'promo/demo-style.png', startSeconds: 14 },
  { src: 'promo/demo-rotate.png', startSeconds: 18 },
] as const

export function Md2PdfPromo() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={styles.canvas}>
      <Background frame={frame} />
      <Sequence
        from={0}
        durationInFrames={seconds(fps, 3)}
        premountFor={seconds(fps, 1)}
      >
        <IntroScene />
      </Sequence>
      <Sequence
        from={seconds(fps, 3)}
        durationInFrames={seconds(fps, 23)}
        premountFor={seconds(fps, 1)}
      >
        <DemoScene />
      </Sequence>
      <Sequence
        from={seconds(fps, 26)}
        durationInFrames={seconds(fps, 4)}
        premountFor={seconds(fps, 1)}
      >
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  )
}

function Background({ frame }: { frame: number }) {
  const drift = interpolate(frame, [0, 900], [-36, 36], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={styles.background}>
      <div style={{ ...styles.grid, transform: `translateX(${drift}px)` }} />
      <div style={{ ...styles.diagonalBand, left: -140 + drift * 0.2 }} />
      <div style={{ ...styles.diagonalBandWarm, right: -180 - drift * 0.2 }} />
    </AbsoluteFill>
  )
}

function IntroScene() {
  const frame = useCurrentFrame()
  const enter = enterExit(frame, 0, 90, 22)
  const logoScale = interpolate(frame, [0, 30], [0.82, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const titleY = interpolate(frame, [8, 38], [34, 0], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        ...styles.centerScene,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px)`,
      }}
    >
      <div style={{ ...styles.heroLogo, transform: `scale(${logoScale})` }}>
        <Img src={staticFile('favicon.svg')} style={styles.heroLogoImage} />
      </div>
      <div style={{ ...styles.heroKicker, opacity: fadeIn(frame, 12, 18) }}>
        md2pdf
      </div>
      <div
        style={{
          ...styles.heroTitle,
          opacity: fadeIn(frame, 18, 28),
          transform: `translateY(${titleY}px)`,
        }}
      >
        Markdownを、そのままPDFへ
      </div>
      <div style={{ ...styles.heroSubtitle, opacity: fadeIn(frame, 36, 24) }}>
        ブラウザだけで、A4プレビューと印刷保存まで。
      </div>
      <div style={{ ...styles.heroUrl, opacity: fadeIn(frame, 48, 24) }}>
        md2pdf.mogami.dev
      </div>
    </AbsoluteFill>
  )
}

function DemoScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mode = getDemoMode(frame, fps)
  const appear = fadeIn(frame, 0, 30)

  return (
    <AbsoluteFill
      style={{
        ...styles.demoScene,
        opacity: appear,
        transform: `translateY(${(1 - appear) * 24}px)`,
      }}
    >
      <ScreenshotDemo frame={frame} />
      <DemoCaption mode={mode} frame={frame} />
    </AbsoluteFill>
  )
}

function ScreenshotDemo({ frame }: { frame: number }) {
  const { fps } = useVideoConfig()
  const scale = interpolate(frame, [0, seconds(fps, 23)], [1, 1.016], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ ...styles.appFrame, transform: `scale(${scale})` }}>
      {DEMO_SHOTS.map((shot, index) => (
        <Img
          key={shot.src}
          src={staticFile(shot.src)}
          style={{
            ...styles.demoScreenshot,
            opacity: getShotOpacity(frame, index, fps),
          }}
        />
      ))}
    </div>
  )
}

function DemoCaption({ mode, frame }: { mode: DemoMode; frame: number }) {
  const { fps } = useVideoConfig()
  const localFrame = frame - getModeStart(mode, fps)
  const enter = fadeIn(localFrame, 0, 18)
  const icon = getModeIcon(mode)

  return (
    <div
      style={{
        ...styles.caption,
        opacity: enter,
        transform: `translateX(-50%) translateY(${(1 - enter) * 14}px)`,
      }}
    >
      <div style={styles.captionIcon}>{icon}</div>
      <span>{MODE_LABELS[mode]}</span>
    </div>
  )
}

function OutroScene() {
  const frame = useCurrentFrame()
  const enter = fadeIn(frame, 0, 24)
  const buttonPress = progress(frame, 10, 34)
  const pages = progress(frame, 28, 82)
  const cta = fadeIn(frame, 66, 22)

  return (
    <AbsoluteFill style={{ ...styles.outroScene, opacity: enter }}>
      <div
        style={{
          ...styles.printButtonLarge,
          transform: `translateY(${interpolate(buttonPress, [0, 1], [18, 0])}px) scale(${interpolate(
            buttonPress,
            [0, 1],
            [1, 0.96],
          )})`,
        }}
      >
        <Printer size={34} />
        PDFプレビュー / 出力
      </div>
      <div style={styles.pdfStack}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              ...styles.pdfSheet,
              transform: `translate(${index * 26}px, ${index * 18}px) rotate(${index * 2 - 2}deg) scale(${interpolate(
                pages,
                [0, 1],
                [0.78, 1],
              )})`,
              opacity: progress(pages, index * 0.18, index * 0.18 + 0.36),
            }}
          />
        ))}
      </div>
      <div
        style={{
          ...styles.finalCard,
          opacity: cta,
          transform: `translateY(${(1 - cta) * 22}px)`,
        }}
      >
        <div style={styles.finalLogo}>
          <Img src={staticFile('favicon.svg')} style={styles.finalLogoImage} />
        </div>
        <div>
          <div style={styles.finalTitle}>md2pdf</div>
          <div style={styles.finalSubline}>
            ブラウザだけでMarkdownをPDFへ
          </div>
          <div style={styles.finalUrl}>md2pdf.mogami.dev</div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function getModeIcon(mode: DemoMode) {
  if (mode === 'typing') {
    return <FileText size={22} />
  }

  if (mode === 'style') {
    return <Palette size={22} />
  }

  if (mode === 'keep') {
    return <FileText size={22} />
  }

  if (mode === 'rotate') {
    return <RotateCw size={22} />
  }

  return <Printer size={22} />
}

function getDemoMode(frame: number, fps: number): DemoMode {
  if (frame < seconds(fps, 6)) {
    return 'typing'
  }

  if (frame < seconds(fps, 10)) {
    return 'diagram'
  }

  if (frame < seconds(fps, 14)) {
    return 'keep'
  }

  if (frame < seconds(fps, 18)) {
    return 'style'
  }

  return 'rotate'
}

function getModeStart(mode: DemoMode, fps: number) {
  if (mode === 'diagram') {
    return seconds(fps, 6)
  }

  if (mode === 'style') {
    return seconds(fps, 14)
  }

  if (mode === 'rotate') {
    return seconds(fps, 18)
  }

  if (mode === 'keep') {
    return seconds(fps, 10)
  }

  return 0
}

function getShotOpacity(frame: number, index: number, fps: number) {
  const shot = DEMO_SHOTS[index]
  const nextShot = DEMO_SHOTS[index + 1]
  const fadeFrames = seconds(fps, 0.22)
  const start = seconds(fps, shot.startSeconds)
  const nextStart = nextShot ? seconds(fps, nextShot.startSeconds) : undefined
  const enter =
    index === 0
      ? 1
      : interpolate(frame, [start - fadeFrames, start], [0, 1], {
          easing: EASE_OUT,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
  const exit =
    nextStart === undefined
      ? 1
      : interpolate(frame, [nextStart - fadeFrames, nextStart], [1, 0], {
          easing: EASE_OUT,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })

  return Math.min(enter, exit)
}

function seconds(fps: number, value: number) {
  return Math.round(fps * value)
}

function fadeIn(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function enterExit(frame: number, start: number, end: number, fade: number) {
  const enter = fadeIn(frame, start, fade)
  const exit = interpolate(frame, [end - fade, end], [1, 0], {
    easing: EASE_IN_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return Math.min(enter, exit)
}

function progress(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

const styles: Record<string, CSSProperties> = {
  canvas: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    color: '#172033',
    backgroundColor: '#f4f7fb',
    fontFamily: SANS,
    letterSpacing: 0,
  },
  background: {
    background:
      'linear-gradient(135deg, #f4f8fb 0%, #eef7f5 42%, #fff8ed 72%, #f8fbfc 100%)',
  },
  grid: {
    position: 'absolute',
    inset: -80,
    backgroundImage:
      'linear-gradient(#dbe5ee 1px, transparent 1px), linear-gradient(90deg, #dbe5ee 1px, transparent 1px)',
    backgroundSize: '72px 72px',
    opacity: 0.34,
  },
  diagonalBand: {
    position: 'absolute',
    top: -140,
    width: 540,
    height: 1400,
    transform: 'rotate(18deg)',
    background: 'linear-gradient(180deg, rgba(15,118,110,0.12), rgba(37,99,235,0.05))',
    border: '1px solid rgba(15,118,110,0.12)',
  },
  diagonalBandWarm: {
    position: 'absolute',
    bottom: -180,
    width: 520,
    height: 1300,
    transform: 'rotate(18deg)',
    background: 'linear-gradient(180deg, rgba(217,119,6,0.13), rgba(225,29,72,0.05))',
    border: '1px solid rgba(217,119,6,0.12)',
  },
  centerScene: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  heroLogo: {
    width: 150,
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#ecfdf9',
    border: '2px solid #b7ded6',
    boxShadow: '0 28px 70px rgba(15, 23, 42, 0.16)',
  },
  heroLogoImage: {
    width: 124,
    height: 124,
  },
  heroKicker: {
    marginTop: 30,
    color: '#0f766e',
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 0,
  },
  heroTitle: {
    marginTop: 18,
    color: '#111827',
    fontSize: 78,
    fontWeight: 860,
    lineHeight: 1.05,
    letterSpacing: 0,
  },
  heroSubtitle: {
    marginTop: 24,
    color: '#475569',
    fontSize: 31,
    fontWeight: 650,
    letterSpacing: 0,
  },
  heroUrl: {
    marginTop: 16,
    color: '#0f766e',
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 0,
  },
  demoScene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appFrame: {
    position: 'absolute',
    top: 112,
    left: 120,
    width: 1680,
    height: 820,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    border: '1px solid rgba(148, 163, 184, 0.42)',
    boxShadow: '0 42px 92px rgba(15, 23, 42, 0.2)',
    transformOrigin: 'center center',
  },
  demoScreenshot: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  appToolbar: {
    height: 74,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 26px',
    borderBottom: '1px solid #d7dee5',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  brandCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  brandMark: {
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#ecfdf9',
    border: '1px solid #b7ded6',
  },
  brandImage: {
    width: 42,
    height: 42,
  },
  brandName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: 0,
  },
  brandSubline: {
    marginTop: 7,
    color: '#64748b',
    fontSize: 14,
    fontWeight: 560,
    letterSpacing: 0,
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  toolbarButton: {
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 8,
    padding: '0 16px',
    color: '#26323f',
    backgroundColor: '#ffffff',
    border: '1px solid #d7dee5',
    fontSize: 15,
    fontWeight: 740,
  },
  primaryToolbarButton: {
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 8,
    padding: '0 17px',
    color: '#ffffff',
    backgroundColor: '#0f766e',
    border: '1px solid #0f766e',
    boxShadow: '0 12px 24px rgba(15, 118, 110, 0.22)',
    fontSize: 15,
    fontWeight: 760,
  },
  workspace: {
    display: 'grid',
    gridTemplateColumns: '520px 1fr',
    height: 746,
  },
  editorPanel: {
    overflow: 'hidden',
    borderRight: '1px solid #d7dee5',
    backgroundColor: '#ffffff',
  },
  previewPanel: {
    backgroundColor: '#e6ebef',
  },
  panelHeader: {
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    color: '#64748b',
    borderBottom: '1px solid #d7dee5',
    backgroundColor: '#ffffff',
  },
  panelTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: 780,
    letterSpacing: 0,
  },
  panelMeta: {
    fontSize: 13,
    fontWeight: 650,
    letterSpacing: 0,
  },
  stylePanel: {
    display: 'grid',
    gap: 11,
    padding: '14px 16px 16px',
    backgroundColor: '#f8fbfc',
    borderBottom: '1px solid #d7dee5',
  },
  presetsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 7,
  },
  presetButton: {
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    color: '#26323f',
    backgroundColor: '#ffffff',
    border: '1px solid #d7dee5',
    fontSize: 13,
    fontWeight: 760,
    letterSpacing: 0,
  },
  compactControls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.4fr',
    gap: 9,
    alignItems: 'end',
  },
  fieldMock: {
    display: 'grid',
    gap: 5,
  },
  fieldLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0,
  },
  fieldValue: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 7,
    padding: '0 10px',
    color: '#111827',
    backgroundColor: '#ffffff',
    border: '1px solid #d7dee5',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0,
  },
  swatches: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  codeEditor: {
    height: 554,
    overflow: 'hidden',
    padding: '18px 0',
    backgroundColor: '#fbfcfd',
    fontFamily: MONO,
  },
  codeLine: {
    display: 'grid',
    gridTemplateColumns: '54px 1fr',
    minHeight: 26,
    alignItems: 'center',
    fontSize: 15,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  lineNumber: {
    color: '#94a3b8',
    textAlign: 'right',
    paddingRight: 14,
    fontSize: 13,
    letterSpacing: 0,
  },
  codeText: {
    minWidth: 0,
    whiteSpace: 'pre',
    overflow: 'hidden',
    textOverflow: 'clip',
    letterSpacing: 0,
  },
  cursor: {
    display: 'inline-block',
    width: 8,
    height: 20,
    marginLeft: 3,
    verticalAlign: -4,
    backgroundColor: '#0f766e',
  },
  previewCanvas: {
    position: 'relative',
    height: 698,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pageShadowBack: {
    position: 'absolute',
    width: 510,
    height: 656,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.14)',
  },
  previewPage: {
    position: 'relative',
    width: 520,
    height: 668,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    boxShadow: '0 28px 58px rgba(15, 23, 42, 0.2)',
  },
  pageChrome: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    color: '#94a3b8',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  pageContent: {
    position: 'relative',
    padding: '26px 34px',
    fontFamily: 'Charter, "Bitstream Charter", Cambria, serif',
  },
  pageTitle: {
    paddingBottom: 10,
    borderBottom: '3px solid #0f766e',
    fontFamily: SANS,
    fontWeight: 840,
    lineHeight: 1.14,
    letterSpacing: 0,
  },
  pageParagraph: {
    margin: '16px 0 14px',
    color: '#334155',
    fontSize: 16,
    lineHeight: 1.62,
    letterSpacing: 0,
  },
  pageTable: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    overflow: 'hidden',
    borderRadius: 7,
    border: '1px solid #d6dde5',
    fontFamily: SANS,
    fontSize: 13,
    letterSpacing: 0,
  },
  tableHeader: {
    padding: '9px 11px',
    color: '#172033',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #d6dde5',
    fontWeight: 800,
    letterSpacing: 0,
  },
  tableCell: {
    padding: '9px 11px',
    color: '#334155',
    borderTop: '1px solid #d6dde5',
    fontWeight: 620,
    letterSpacing: 0,
  },
  diagramArea: {
    position: 'absolute',
    left: 34,
    top: 276,
    width: 452,
  },
  sectionHeading: {
    marginBottom: 10,
    fontFamily: SANS,
    fontSize: 18,
    fontWeight: 840,
    letterSpacing: 0,
  },
  mermaidBox: {
    position: 'relative',
    width: 452,
    height: 168,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    border: '1px solid #d9e1e9',
  },
  flowNode: {
    position: 'absolute',
    top: 58,
    width: 82,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#ffffff',
    border: '2px solid #cbd5e1',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
    fontFamily: SANS,
    fontSize: 12,
    fontWeight: 820,
    letterSpacing: 0,
  },
  flowConnector: {
    position: 'absolute',
    top: 83,
    height: 3,
    borderRadius: 999,
  },
  wideAssetArea: {
    position: 'absolute',
    left: 34,
    top: 286,
    width: 452,
    height: 300,
  },
  rotateFrame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 11,
    backgroundColor: '#f8fafc',
    border: '1px solid #d9e1e9',
  },
  rotationButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    display: 'flex',
    gap: 6,
    borderRadius: 9,
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    boxShadow: '0 10px 22px rgba(15, 23, 42, 0.16)',
  },
  rotateButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    border: '1px solid #d7dee5',
  },
  wideImage: {
    width: 500,
    height: 162,
    objectFit: 'contain',
    transformOrigin: 'center center',
    filter: 'drop-shadow(0 12px 18px rgba(15, 23, 42, 0.14))',
  },
  caption: {
    position: 'absolute',
    left: '50%',
    bottom: 42,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    maxWidth: 1040,
    minHeight: 62,
    borderRadius: 12,
    padding: '0 24px 0 16px',
    color: '#172033',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    border: '1px solid rgba(203, 213, 225, 0.82)',
    boxShadow: '0 20px 54px rgba(15, 23, 42, 0.16)',
    fontSize: 25,
    fontWeight: 820,
    lineHeight: 1.25,
    letterSpacing: 0,
  },
  captionIcon: {
    width: 42,
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    borderRadius: 9,
    color: '#0f766e',
    backgroundColor: '#ecfdf9',
    border: '1px solid #b7ded6',
  },
  outroScene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  printButtonLarge: {
    position: 'absolute',
    top: 132,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    height: 74,
    borderRadius: 12,
    padding: '0 28px',
    color: '#ffffff',
    backgroundColor: '#0f766e',
    boxShadow: '0 24px 58px rgba(15, 118, 110, 0.3)',
    fontSize: 26,
    fontWeight: 840,
    letterSpacing: 0,
  },
  pdfStack: {
    position: 'absolute',
    top: 260,
    left: 760,
    width: 430,
    height: 420,
  },
  pdfSheet: {
    position: 'absolute',
    width: 330,
    height: 430,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    border: '1px solid #d7dee5',
    boxShadow: '0 28px 62px rgba(15, 23, 42, 0.2)',
  },
  finalCard: {
    position: 'absolute',
    bottom: 106,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    borderRadius: 18,
    padding: '20px 30px',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    border: '1px solid rgba(203, 213, 225, 0.82)',
    boxShadow: '0 26px 70px rgba(15, 23, 42, 0.16)',
  },
  finalLogo: {
    width: 72,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ecfdf9',
    border: '1px solid #b7ded6',
  },
  finalLogoImage: {
    width: 62,
    height: 62,
  },
  finalTitle: {
    color: '#111827',
    fontSize: 40,
    fontWeight: 880,
    lineHeight: 1,
    letterSpacing: 0,
  },
  finalSubline: {
    marginTop: 9,
    color: '#475569',
    fontSize: 24,
    fontWeight: 720,
    letterSpacing: 0,
  },
  finalUrl: {
    marginTop: 8,
    color: '#0f766e',
    fontSize: 21,
    fontWeight: 820,
    letterSpacing: 0,
  },
}
