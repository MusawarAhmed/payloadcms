
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function checkPage() {
  const payload = await getPayload({ config: configPromise })
  
  try {
      const page = await payload.findByID({
          collection: 'pages',
          id: 2
      })
      console.log('Page 2 found:', page.title, page.slug, page._status)
  } catch (e: any) {
      console.error('Page 2 retrieval failed:', e.message)
  }

  try {
      const page = await payload.find({
          collection: 'pages',
          where: { slug: { equals: 'home' } }
      })
      console.log('Pages with slug "home":', page.totalDocs)
      page.docs.forEach(d => console.log(`- ID: ${d.id}, Title: ${d.title}`))
  } catch (e: any) {
       console.error('Page search failed:', e.message)
  }
  process.exit(0)
}

checkPage()
