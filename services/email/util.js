import fs from 'node:fs/promises'

export async function createTestEmailHTMLFile(content) {
  try {
    await fs.writeFile('test.html', content)
  } catch (err) {
    console.log(err)
  }
}
