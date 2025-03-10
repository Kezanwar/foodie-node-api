import { landingUrl } from '#app/config/config.js'
import axios from 'axios'
import Str from '#app/services/string/index.js'

export const fetchBlogs = async () => {
  const res = await axios.get(`${landingUrl}/api/recent`)
  return res.data.edges.map((d) => ({
    ...d.node,
    excerpt: Str.removeTags(d.node.excerpt),
    featuredImage: d.node.featuredImage.node.sourceUrl,
  }))
}
