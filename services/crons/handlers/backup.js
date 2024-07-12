import { exec } from 'child_process'
import { MONGO_URI } from '../../db/index.js'

// Define your MongoDB connection details
const uri = MONGO_URI
const outputDir = '/backups'

// Construct the mongodump command
const command = `mongodump --uri="${uri}" --out=${outputDir}`

const handler = () => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing mongodump: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`Error: ${stderr}`)
      return
    }
    console.log(`Mongodump output: ${stdout}`)
  })
}

export default handler
