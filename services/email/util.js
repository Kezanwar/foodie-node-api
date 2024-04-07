import fs from 'node:fs/promises'

export async function createTestEmailHTML(content) {
  try {
    await fs.writeFile('/test.html', content)
  } catch (err) {
    console.log(err)
  }
}
