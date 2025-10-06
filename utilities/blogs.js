import { landingUrl } from '#app/config/config.js'
import axios from 'axios'
import Str from '#app/services/string/index.js'

const processFetchedBlogs = (data) => {
  return data.edges.map((d) => ({
    ...d.node,
    excerpt: Str.removeTags(d.node.excerpt),
    featuredImage: d.node.featuredImage.node.sourceUrl,
  }))
}

const TEMP = processFetchedBlogs({
  edges: [
    {
      node: {
        title: 'Hidden Gems: The Places Locals Keep to Themselves',
        excerpt:
          '<p>In every city, there are two kinds of places to eat and drink. The ones that get all the hype — boosted by big budgets, influencers, and slick marketing. And then there are the hidden gems. These are the small, independent spots you probably wouldn’t notice unless someone tipped you off. The backstreet ramen joint [&hellip;]</p>',
        slug: 'hidden-gems-the-place-locals-keep-to-themselves',
        date: '2025-05-09T16:18:02',
        restaurant_review_fields: {
          readTime: '2',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2025/09/hidden-Gem-27046360_1280.jpg',
          },
        },
      },
    },
    {
      node: {
        title: 'Why Eating Local Tastes Better (And Supports Your Community)',
        excerpt:
          '<p>Let’s cut to it: local food just hits different. It’s not because of some marketing buzzword — it’s because when you eat local, you’re not just buying a meal. You’re backing the people, stories, and flavours that make your area what it is. Here’s why eating local is better — for your plate, your pocket, [&hellip;]</p>',
        slug: 'why-eating-local-tastes-better',
        date: '2023-10-04T18:23:24',
        restaurant_review_fields: {
          readTime: '2',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2025/06/Hidden-gems-3.webp',
          },
        },
      },
    },
    {
      node: {
        title: 'How to Eat Out Smarter (And Still Enjoy Every Bite)',
        excerpt:
          '<p>Let’s be honest: eating out can add up fast.But there are simple ways to keep enjoying great food, new places, and proper nights out — without draining your wallet. Here’s how to make it work. Go where the locals go Forget glossy menus designed for tourists. The best deals are usually found in the spots [&hellip;]</p>',
        slug: 'how-to-eat-out-smarter',
        date: '2023-10-04T17:16:33',
        restaurant_review_fields: {
          readTime: '5',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2025/09/hidden-gem-8024234_1280.jpg',
          },
        },
      },
    },
  ],
})

export const fetchBlogs = async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await axios.get(`${landingUrl}/api/recent`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    return processFetchedBlogs(res.data)
  } catch (error) {
    return TEMP
  }
}
