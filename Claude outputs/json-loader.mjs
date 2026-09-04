// Test-only ESM loader: force `type: "json"` import attributes on any bare
// `.json` import so plain Node ESM (which requires `with { type: "json" }`)
// can load the real source files, which use bare imports (valid under
// Vite's bundler, not under plain Node). Used only by the integration test
// scripts in /mnt/user-data/outputs/woltar — never shipped to the repo.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' } })
  }
  return nextLoad(url, context)
}
