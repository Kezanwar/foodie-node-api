import { worker } from './initialize.js'

const WorkerService = await worker.launchService({
  exceptionHandler({ error }) {
    console.error('WorkerService:', error)
  },
})

export default WorkerService
