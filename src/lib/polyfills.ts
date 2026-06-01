// Runtime polyfills for older mobile browsers (notably iOS Safari < 17.4).
// Imported first on the main thread AND prepended into the pdfjs worker.
/* eslint-disable @typescript-eslint/no-explicit-any */

// 1) Promise.withResolvers (Safari < 17.4)
const P = Promise as unknown as { withResolvers?: () => unknown }
if (typeof P.withResolvers !== 'function') {
  P.withResolvers = function withResolvers() {
    let resolve: (value: unknown) => void = () => {}
    let reject: (reason?: unknown) => void = () => {}
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

// 2) Async iteration of ReadableStream — `for await (const x of stream)`.
// pdfjs getTextContent relies on this; Safari only shipped it in 17.4.
const RSP: any =
  typeof ReadableStream !== 'undefined' ? (ReadableStream.prototype as any) : null
if (RSP && typeof RSP[Symbol.asyncIterator] !== 'function') {
  RSP.values = function (this: ReadableStream, options?: { preventCancel?: boolean }) {
    const preventCancel = !!options?.preventCancel
    const reader = this.getReader()
    return {
      next() {
        return reader.read().then(
          (r) => {
            if (r.done) reader.releaseLock()
            return r
          },
          (e) => {
            reader.releaseLock()
            throw e
          },
        )
      },
      return(value: unknown) {
        if (!preventCancel) {
          const cancelled = reader.cancel(value)
          reader.releaseLock()
          return cancelled.then(() => ({ done: true, value }))
        }
        reader.releaseLock()
        return Promise.resolve({ done: true, value })
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
  }
  RSP[Symbol.asyncIterator] = RSP.values
}

export {}
