import { Composition } from 'remotion'
import { Md2PdfPromo } from './Md2PdfPromo'

export function RemotionRoot() {
  return (
    <Composition
      id="Md2PdfPromo"
      component={Md2PdfPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}
