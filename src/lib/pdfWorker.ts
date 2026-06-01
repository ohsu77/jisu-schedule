// Custom pdfjs worker entry: install the polyfill in the worker scope FIRST,
// then load the real pdfjs worker. Bundled by Vite via the `?worker` import.
import './polyfills'
import 'pdfjs-dist/build/pdf.worker.min.mjs'
