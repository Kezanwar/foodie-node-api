import generalWorker from '../../workers/general.worker.js'

export const generalWorkerService = await generalWorker.launchService({
  exceptionHandler({ error }) {
    console.error('generalWorkerService:', error)
  },
})
