import { worker } from './initialize.js'

export const workerService = await worker.launchService({
  exceptionHandler({ error }) {
    console.error('workerService:', error)
  },
})
