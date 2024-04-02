import workerConfig from './initialize.js'

const WorkerService = await workerConfig.launchService({
  exceptionHandler({ error }) {
    console.error('WorkerService:', error)
  },
})

export default WorkerService
