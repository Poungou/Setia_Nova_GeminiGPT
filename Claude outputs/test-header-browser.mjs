// Run after npm run build. Optional dependency stays outside the project manifest:
// npm install --prefix node_modules/.cache/header-browser --no-package-lock --no-save playwright-core
// node "Claude outputs/test-header-browser.mjs" [--probe | --dismiss-only]
import { chromium } from '../node_modules/.cache/header-browser/node_modules/playwright-core/index.mjs'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'

const origin = 'http://127.0.0.1:4179'
const probe = process.argv.includes('--probe')
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!executablePath) throw new Error('Chrome or Edge must be installed.')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { windowsHide: true, stdio: 'pipe' })
let browser
let failures = 0
let checks = 0
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite preview exited; port 4179 must be free.')
    try { if ((await fetch(origin)).ok) break } catch { /* Wait for the static server. */ }
    await delay(100)
  }
  browser = await chromium.launch({ executablePath, headless: true })
  for (const theme of probe ? ['dark'] : ['dark', 'light', 'woltar']) {
    for (const mobile of probe ? [false] : [false, true]) {
      const context = await browser.newContext({ viewport: { width: mobile ? 375 : 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile })
      // This test uses static preview only. No external services or API requests.
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        const apiRequest = url.pathname.startsWith('/api/') || /^\/__(public|auth|aether|account|admin)\/api(?:\/|$)/.test(url.pathname)
        return url.origin !== origin || apiRequest ? route.abort() : route.continue()
      })
      await context.addInitScript(value => localStorage.setItem('woltar-theme', value), theme)
      const page = await context.newPage()
      // « Univers » est un lien simple vers /univers : plus de sous-menu.
      for (const from of probe ? ['/journal'] : ['/journal', '/lieux']) {
        for (const method of probe ? ['click'] : ['click', 'Enter', 'Space']) {
          await page.goto(origin + from, { waitUntil: 'domcontentloaded' })
          const activate = async locator => {
            if (method === 'click') {
              if (mobile) await locator.tap()
              else await locator.click()
            }
            else { await locator.focus(); await locator.press(method) }
          }
          if (mobile) await activate(page.getByRole('button', { name: 'Ouvrir le menu', exact: true }))
          const nav = page.locator(mobile ? '.site-header__nav--mobile' : '.site-header__nav--desktop')
          const link = nav.locator('a[href="/univers"]')
          await link.waitFor({ state: 'visible' })
          const noSubmenu = await page.locator('.site-header__caret, .site-header__submenu, #universe-desktop, #universe-mobile').count() === 0
          const hit = await link.evaluate(element => {
            const box = element.getBoundingClientRect()
            const x = box.x + box.width / 2
            const y = box.y + box.height / 2
            const target = document.elementFromPoint(x, y)
            return { x, y, ok: element.contains(target), target: target?.outerHTML.slice(0, 200) }
          })
          if (method === 'click') {
            if (mobile) await page.touchscreen.tap(hit.x, hit.y)
            else await page.mouse.click(hit.x, hit.y)
          }
          else { await link.focus(); await link.press(method) }
          let navigated = true
          try { await page.waitForURL(origin + '/univers', { timeout: 1500 }) } catch { navigated = false }
          const closed = !mobile || await page.locator('#navigation-mobile').count() === 0
          const ok = hit.ok && navigated && closed && noSubmenu
          checks++
          if (!ok) failures++
          console.log(JSON.stringify({ ok, theme, mobile, from, method, hit: hit.ok, interceptedBy: hit.ok ? undefined : hit.target, navigated, closed, noSubmenu }))
        }
      }
      if (!probe && mobile) {
        for (const dismiss of ['Escape', 'outside']) {
          await page.goto(origin + '/univers', { waitUntil: 'domcontentloaded' })
          await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).tap()
          if (dismiss === 'Escape') await page.keyboard.press('Escape')
          else await page.locator('main').click({ position: { x: 5, y: 5 } })
          const closed = await page.locator('#navigation-mobile').count() === 0
          const focusRestored = dismiss !== 'Escape' || await page.locator('.site-header__toggle').evaluate(element => element === document.activeElement)
          const ok = closed && focusRestored
          checks++
          if (!ok) failures++
          console.log(JSON.stringify({ ok, theme, mobile, dismiss, closed, focusRestored }))
        }
      }
      await context.close()
    }
  }
} finally {
  await browser?.close()
  server.kill()
}
console.log(`${checks - failures}/${checks} browser cases passed`)
if (failures) process.exitCode = 1
