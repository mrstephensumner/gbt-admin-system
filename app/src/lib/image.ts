/**
 * Client-side display rendition: downscale to 480px max edge as WebP before
 * upload, so the Worker never needs image processing (research R4 note).
 */
export async function makeDisplayRendition(file: File, maxEdge = 480): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  } catch {
    return null
  }
}
