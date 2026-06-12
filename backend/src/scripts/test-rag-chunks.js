const fs = require('fs')
const path = require('path')

const RAG_DOCS_DIR = path.join(
  __dirname,
  '..',
  'data',
  'rag_docs'
)

const files = fs.readdirSync(RAG_DOCS_DIR)

console.log(files)