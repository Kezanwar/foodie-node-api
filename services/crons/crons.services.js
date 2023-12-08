import expireDeals from './deals/expire-deal.cron.js'

const runCrons = () => {
  expireDeals()
}

export default runCrons
