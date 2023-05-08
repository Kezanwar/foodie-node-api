import cron from 'node-cron'
import { worker } from '../workers/worker.js'
import Voucher from '../models/Voucher.js'

const voucherExpireCron = cron.schedule('* * * * *', async () => {
  const result = await worker({
    name: 'getTimezonesToExpire',
  })
  const { minusGMT, plusGMT } = result

  console.log(result)

  if (plusGMT?.length > 0) {
    const vouchers = await Voucher.find({ timezone: { $in: plusGMT } })
    vouchers.forEach((v) => console.log(v?.end_date))
  }
})

export default voucherExpireCron
