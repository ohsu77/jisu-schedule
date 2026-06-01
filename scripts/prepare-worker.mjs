// Generate public/pdf.worker.min.mjs = [withResolvers polyfill] + [pdfjs worker].
// The pdfjs worker has no static imports, so prepending runs the polyfill first
// (covers iOS Safari < 17.4 inside the worker scope). Run by predev/prebuild.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const src = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')

const polyfill =
  "if(typeof Promise.withResolvers!=='function'){" +
  'Promise.withResolvers=function(){var a,b;var p=new Promise(function(r,j){a=r;b=j;});' +
  'return{promise:p,resolve:a,reject:b};};}\n'

mkdirSync('public', { recursive: true })
writeFileSync('public/pdf.worker.min.mjs', polyfill + readFileSync(src, 'utf8'))
console.log('✓ public/pdf.worker.min.mjs prepared (polyfill + pdfjs worker)')
