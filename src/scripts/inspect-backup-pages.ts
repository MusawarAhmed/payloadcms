
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const backupPath = path.resolve(dirname, '../../backup.json')
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

if (backup.pages) {
    console.log('--- Pages found in backup.json ---')
    backup.pages.forEach((p: any) => {
        console.log(`ID: ${p.id || p._id}, Slug: ${p.slug}, Title: ${p.title}`)
    })
} else {
    console.log('No pages found in backup.json')
}
