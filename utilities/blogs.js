import { landingUrl } from '#app/config/config.js'
import axios from 'axios'
import Str from '#app/services/string/index.js'

const TEMP = {
  edges: [
    {
      node: {
        title: 'Your Favourite Restaurant Probably Has a Deal You Don’t Know About',
        excerpt: `<p>Here’s How to Find It Without the Fuss Let’s be real: you&#8217;re probably spending more than you need to when eating out.Your go-to spots? They’ve likely got deals running — lunchtime offers, weeknight specials, happy hour menus — but unless you’re trawling social media 24/7 or randomly checking in-store signs, you’re missing out. Foodie Finds [&hellip;]</p>\n`,
        slug: 'your-favourite-restaurant-probably-has-a-deal-you-dont-know-about',
        date: '2025-05-09T16:18:02',
        restaurant_review_fields: {
          readTime: '2',
        },
        featuredImage: {
          node: {
            sourceUrl:
              'https://cms.thefoodie.app/wp-content/uploads/2023/10/4077888657779979686_IMG_2382-1024x776-1.jpg',
          },
        },
      },
    },
    {
      node: {
        title: 'Say Goodbye to Quiet Nights',
        excerpt: `<p>Build Local Buzz with Foodie Running a bar or coffee shop? You know the drill — great service, quality drinks, amazing vibes. But then come the quiet nights, the mid-week dips in footfall, and the constant battle to stay top of mind. And sure, you’ve probably tried social media ads. But between the cost, the [&hellip;]</p>\n`,
        slug: 'goodbye-to-quiet-nights',
        date: '2023-10-04T18:23:24',
        restaurant_review_fields: {
          readTime: '2',
        },
        featuredImage: {
          node: {
            sourceUrl:
              'https://cms.thefoodie.app/wp-content/uploads/2023/10/4077888657779979686_IMG_2382-1024x776-1.jpg',
          },
        },
      },
    },
    {
      node: {
        title: 'West Village: West Didbsury',
        excerpt: `<p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Inside The Didsbury Restaurant Where Small Plates Take You From Japan To Ethiopia Lorem ipsum, dolor sit amet consectetur adipisicing elit. Autem at aperiam deleniti culpa consequuntur ad fuga, consectetur quis sequi. Facilis, labore? Numquam cupiditate incidunt omnis esse eos necessitatibus facilis tempora. Lorem ipsum, dolor sit [&hellip;]</p>\n`,
        slug: 'west-village-west-didbsury',
        date: '2023-10-04T17:16:33',
        restaurant_review_fields: {
          readTime: '5',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2023/10/151119-120223_west-village.jpg',
          },
        },
      },
    },
    {
      node: {
        title: 'Sud Pasta: Sale',
        excerpt: `<p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Inside The Didsbury Restaurant Where Small Plates Take You From Japan To Ethiopia Lorem ipsum, dolor sit amet consectetur adipisicing elit. Autem at aperiam deleniti culpa consequuntur ad fuga, consectetur quis sequi. Facilis, labore? Numquam cupiditate incidunt omnis esse eos necessitatibus facilis tempora. Lorem ipsum, dolor sit [&hellip;]</p>\n`,
        slug: 'sud-pasta-sale',
        date: '2023-10-03T16:47:24',
        restaurant_review_fields: {
          readTime: '5',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2023/10/7e42b92d1dba6077b880adeb8f8161b2.jpeg',
          },
        },
      },
    },
    {
      node: {
        title: 'Volta: West Didsbury',
        excerpt: `<p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Inside The Didsbury Restaurant Where Small Plates Take You From Japan To Ethiopia Lorem ipsum, dolor sit amet consectetur adipisicing elit. Autem at aperiam deleniti culpa consequuntur ad fuga, consectetur quis sequi. Facilis, labore? Numquam cupiditate incidunt omnis esse eos necessitatibus facilis tempora. Lorem ipsum, dolor sit [&hellip;]</p>\n`,
        slug: 'volta-west-didsbury',
        date: '2023-08-15T16:34:53',
        restaurant_review_fields: {
          readTime: '8',
        },
        featuredImage: {
          node: {
            sourceUrl: 'https://cms.thefoodie.app/wp-content/uploads/2023/08/volta.jpeg',
          },
        },
      },
    },
  ],
}

export const fetchBlogs = async () => {
  try {
    // const res = await axios.get(`${landingUrl}/api/recent`)
    return TEMP.edges.map((d) => ({
      ...d.node,
      excerpt: Str.removeTags(d.node.excerpt),
      featuredImage: d.node.featuredImage.node.sourceUrl,
    }))
  } catch (error) {
    console.log(error)
    return undefined
  }
}
