import Database from 'better-sqlite3'
import { createTables } from './schema'
import fs from 'fs'
import path from 'path'

const cwd = process.cwd()

const isTest = process.env.NODE_ENV === 'test'
const dbPath = isTest
  ? path.resolve(cwd, 'data/test_linkflow.db')
  : path.resolve(cwd, 'data/linkflow.db')

function initDatabase(): Database.Database {
  const dataDir = path.dirname(dbPath)

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const db = new Database(dbPath)

  db.exec(createTables)

  return db
}

export const db = initDatabase()
