import cron from 'node-cron'
import { worker } from '../workers/worker.js'

const voucherExpireCron = cron.schedule('* * * * *', async () => {
  // Run the "add" function on a separate thread and wait
  // for it to complete before moving forward.
  const result = await worker({
    name: 'getTimezonesToExpire',
  })

  console.log(result)
})

export default voucherExpireCron
