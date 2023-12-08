import { worker } from './worker.init.js'

export const workerService = await worker.launchService({
  exceptionHandler({ error }) {
    console.error('workerService:', error)
  },
})
