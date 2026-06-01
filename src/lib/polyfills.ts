// Runtime polyfills for older mobile browsers.
// iOS Safari < 17.4 lacks Promise.withResolvers, which pdfjs depends on.
// Imported first on the main thread AND inside the pdfjs worker.

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

export {}
