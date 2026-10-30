/**
 * Downloads the live graph SVG as a standalone vector file or a high-DPI PNG.
 * No React. The canvas element is the SVG marked `data-graphflow-canvas`.
 */

export const PNG_EXPORT_FILENAME = 'graphflow-bac.png'
export const SVG_EXPORT_FILENAME = 'graphflow-bac.svg'
export const CANVAS_BACKGROUND = '#090d16'

const SVG_NS = 'http://www.w3.org/2000/svg'

const EXPORT_STYLE = `
.gf-pulse-ring { animation: none; opacity: 0.92; }
.gf-edge-flow { animation: none; stroke-dasharray: 8 6; }
`

export function findGraphCanvas(root: ParentNode | null = typeof document === 'undefined' ? null : document): SVGSVGElement | null {
  if (!root) return null
  const found = root.querySelector('[data-graphflow-canvas]')
  return found instanceof SVGSVGElement ? found : null
}

export function downloadGraphSvg(svg: SVGSVGElement, filename = SVG_EXPORT_FILENAME): void {
  const prepared = prepareExportSvg(svg)
  if (!prepared) throw new Error('Canvasul nu are o dimensiune validă.')
  const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(prepared.svg)}`
  saveBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

export async function downloadGraphPng(svg: SVGSVGElement, filename = PNG_EXPORT_FILENAME): Promise<void> {
  const prepared = prepareExportSvg(svg)
  if (!prepared) throw new Error('Canvasul nu are o dimensiune validă.')
  const { svg: clone, width, height } = prepared
  const markup = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const image = await loadSvgImage(url)
    const ratio = Math.min(3, Math.max(2, window.devicePixelRatio || 1))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D nu este disponibil.')
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.fillStyle = CANVAS_BACKGROUND
    context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)
    const png = await canvasToPngBlob(canvas)
    saveBlob(png, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function prepareExportSvg(source: SVGSVGElement): { svg: SVGSVGElement; width: number; height: number } | null {
  const bounds = source.getBoundingClientRect()
  const width = Math.max(1, Math.round(bounds.width))
  const height = Math.max(1, Math.round(bounds.height))
  if (width < 2 || height < 2) return null

  const clone = source.cloneNode(true)
  if (!(clone instanceof SVGSVGElement)) return null
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  clone.style.backgroundColor = CANVAS_BACKGROUND
  clone.removeAttribute('class')
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')

  const style = source.ownerDocument.createElementNS(SVG_NS, 'style')
  style.textContent = EXPORT_STYLE
  const title = source.ownerDocument.createElementNS(SVG_NS, 'title')
  title.textContent = 'GraphFlow BAC'
  clone.insertBefore(title, clone.firstChild)
  clone.insertBefore(style, title)
  return { svg: clone, width, height }
}

function loadSvgImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nu am putut rasteriza SVG-ul.'))
    image.src = url
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Nu am putut coda PNG-ul.'))
    }, 'image/png')
  })
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
