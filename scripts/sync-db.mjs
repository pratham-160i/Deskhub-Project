import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
copyFileSync(path.join(root, 'db.json'), path.join(root, 'public', 'db.json'))
console.log('sync-db: db.json → public/db.json')
