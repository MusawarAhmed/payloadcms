
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function verifyContent() {
  const payload = await getPayload({ config: configPromise })
  
  // Check Home Page (ID 2)
  console.log('--- Checking Home Page (ID 2) ---')
  try {
      const home = await payload.findByID({ collection: 'pages', id: 2 })
      console.log(`Title: ${home.title}`)
      console.log(`Slug: ${home.slug}`)
      console.log(`Status: ${home._status}`)
      console.log(`Layout Blocks: ${home.layout ? home.layout.length : 0}`)
      if (home.layout && home.layout.length > 0) {
           console.log('Sample Block:', home.layout[0].blockType)
      }
  } catch (e: any) {
      console.error('Home page check failed:', e.message)
  }

  // Check Posts
  console.log('--- Checking Posts ---')
  const posts = await payload.find({ collection: 'posts' })
  posts.docs.forEach(p => {
      // Check content (RichText)
      const contentNodes = p.content && (p.content as any).root && (p.content as any).root.children ? (p.content as any).root.children.length : 0
      console.log(`Post: ${p.title} (ID: ${p.id})`)
      console.log(`- Status: ${p._status}`)
      console.log(`- Content Nodes: ${contentNodes}`)
      // Check meta image
      const metaImage = p.meta?.image
      console.log(`- Meta Image: ${metaImage ? (typeof metaImage === 'object' ? metaImage.id : metaImage) : 'None'}`)
  })
  
  process.exit(0)
}

verifyContent()
