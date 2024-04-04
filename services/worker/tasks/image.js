import sharp from 'sharp'

export async function resizeImg(buffer, { height, width }) {
  try {
    const resizedBuffer = await sharp(buffer)
      .jpeg()
      .resize({ height: height, width: width, fit: 'contain', withoutEnlargement: false })
      .toBuffer()
    return resizedBuffer
  } catch (error) {
    console.error(error)
    throw new Error(error)
  }
}
