// Small helpers for saving / sharing generated artifacts.

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string, type = 'text/calendar') {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename)
}

export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

/** Render a DOM node to PNG, then share to the OS (photo gallery) or download. */
export async function savePng(node: HTMLElement, filename: string): Promise<SaveResult> {
  const { toBlob } = await import('html-to-image')
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })
  if (!blob) throw new Error('이미지를 만들지 못했어요.')

  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // otherwise fall through to a normal download
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
