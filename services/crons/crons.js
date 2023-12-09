import expireDeals from './deals/expire-deal.js'

const runCrons = () => {
  expireDeals()
}

export default runCrons
