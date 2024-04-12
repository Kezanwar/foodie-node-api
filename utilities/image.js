import sharp from 'sharp'

export async function resizeImg(buffer, { height, width }) {
  return sharp(buffer)
    .jpeg()
    .resize({ height: height, width: width, fit: 'contain', withoutEnlargement: false })
    .toBuffer()
}
