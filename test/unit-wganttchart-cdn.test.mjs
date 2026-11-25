import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import wpw from 'w-playwright'
import WGanttchart from '../src/WGanttchart.mjs'
import buildHtml from '../src/buildHtml.mjs'
import { isPng, withPageHook } from './tools/lib.mjs'
import { cdn, useCdnLocal, FP_ROOTS, FP_MANIFEST } from './tools/cdnLocal.mjs'

// 測試用數據: 虛構之一般性內容
const inp = {
    axisStart: '2026-01-01',
    axisEnd: '2027-07-01',
    rows: [
        { id: 'a', label: '需求訪談', start: '2026-01-01', end: '2026-04-01', cls: 'navy' },
        { id: 'b', label: '系統開發', start: '2026-03-01', end: '2026-12-01', cls: 'azure' },
    ],
}

const __dir = path.dirname(fileURLToPath(import.meta.url))
const readJson = (fp) => JSON.parse(fs.readFileSync(fp, 'utf8'))

// codeOf: 讀原始碼並去除註解與字串字面值(由左至右一次掃過, 字串內之 // 與註解內之引號不互相干擾), 供盤點只比對實際程式碼
const NOISE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g
const codeOf = (fp) => fs.readFileSync(fp, 'utf8').replace(NOISE, ' ')

// 規格來源: sgud/rule/rulebook.md R-GANTT-CDN-02(測試開啟之頁面不連外部 CDN: 清單釘 sha256, 內容定址快取, 清單外之外部請求一律中止並使測試失敗, 所有啟動路徑皆掛本地路由)
describe('測試不連外部 CDN(清單與接線)', function() {

    useCdnLocal()

    // 規格: 清單之根 ＝ 產品頁面載入之外部網址(產品改版而清單未更新時轉紅); 頁面內不得另有未列入清單之絕對網址
    it('清單之根等於產品頁面載入之外部網址', function() {
        let html = buildHtml(inp)
        let roots = Object.values(readJson(FP_ROOTS)).sort()
        let manifest = readJson(FP_MANIFEST)
        let tags = [...html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).sort()
        let all = [...new Set([...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]))].sort()
        assert.ok(roots.length >= 2, '清單之根應含繪圖庫之樣式表與腳本')
        assert.deepStrictEqual(tags, roots, '頁面 link/script 載入之外部網址須等於清單之根')
        assert.deepStrictEqual(all, roots, '頁面內之絕對網址須全為清單之根(不得另有外部網址)')
        assert.deepStrictEqual(Object.values(manifest.roots).sort(), roots, 'cdn.manifest.json 之 roots 須等於 cdn.roots.json(重新產生清單)')
        roots.forEach((u) => assert.ok(cdn.lookup(u), `清單未含 ${u}(須重新產生清單)`))
        let keys = Object.keys(manifest.files)
        roots.forEach((u) => assert.ok(keys.includes(u), `清單之 files 未含根 ${u}`))
        assert.ok(keys.length >= roots.length, '清單之 files 須涵蓋全部根(其餘為其相對引用之閉包)')
    })

    // 規格: 每條啟動路徑開啟之頁面皆由本地副本供應清單內網址(接縫不用替身: 真瀏覽器、真路由), 不連 CDN
    // 路徑 A: src 之啟動點 WGanttchart(inp)(基底替身)
    it('啟動路徑 A(src 之 WGanttchart): 繪圖庫由本地副本供應', async function() {
        let n = Object.keys(readJson(FP_MANIFEST).files).length
        let s0 = cdn.stats().served.browser
        let buf = await WGanttchart(inp)
        assert.ok(isPng(buf), '非 PNG')
        assert.strictEqual(cdn.stats().served.browser - s0, n, '清單內每個網址應各由本地副本供應一次')
    })

    // 路徑 B: 測試內直接 wpw.launchChromium()(基底替身; 如 unit-wganttchart.test.mjs 之 withGantt)
    it('啟動路徑 B(直接 wpw.launchChromium): 繪圖庫由本地副本供應', async function() {
        let n = Object.keys(readJson(FP_MANIFEST).files).length
        let s0 = cdn.stats().served.browser
        let browser = await wpw.launchChromium()
        try {
            assert.ok(cdn.isRouted(browser), '基底替身應已掛本地路由')
            let page = await browser.newPage()
            await page.setContent(buildHtml(inp), { waitUntil: 'networkidle' })
            await page.locator('#gantt .vis-item').first().waitFor({ timeout: 15000 })
            assert.strictEqual(await page.evaluate(() => typeof window.vis), 'object', '繪圖庫腳本應已載入')
        }
        finally {
            await browser.close()
        }
        assert.strictEqual(cdn.stats().served.browser - s0, n)
    })

    // 路徑 C: withPageHook 之替身(取代基底替身, 經 nextRouted)
    it('啟動路徑 C(withPageHook 之替身): 繪圖庫由本地副本供應', async function() {
        let n = Object.keys(readJson(FP_MANIFEST).files).length
        let s0 = cdn.stats().served.browser
        let pages = 0
        let buf = await withPageHook(() => pages++, () => WGanttchart(inp))
        assert.strictEqual(pages, 1)
        assert.ok(isPng(buf), '非 PNG')
        assert.strictEqual(cdn.stats().served.browser - s0, n)
    })

    // 規格: 盤點——每個含瀏覽器測試之檔皆登記 useCdnLocal(); 每個以 setBrowserTypeForTest 取代基底替身者(除 cdnLocal.mjs 本身)皆不得直接以 next() 取得瀏覽器, 須經 nextRouted(next)(否則該瀏覽器漏接, 斷網時才紅)
    // 站點全集見規則帳本 R-GANTT-CDN-02; 本案以讀檔掃描 test/ 與 test/tools/
    it('盤點: 測試檔皆登記 useCdnLocal, 替身皆經 nextRouted', function() {
        let dirTest = path.resolve(__dir)
        let dirTools = path.resolve(__dir, 'tools')
        let list = [
            ...fs.readdirSync(dirTest).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(dirTest, f)),
            ...fs.readdirSync(dirTools).filter((f) => f.endsWith('.mjs')).map((f) => path.join(dirTools, f)),
        ]
        let self = path.basename(fileURLToPath(import.meta.url))
        let tests = list.filter((fp) => fp.endsWith('.test.mjs'))
        assert.ok(tests.length >= 4, `應掃到 test/*.test.mjs(掃到 ${tests.length})`)
        // 登記以 describe 為單位: 每個 describe 須各有一次 useCdnLocal(), 故檔內 useCdnLocal( 之次數不得少於 describe( 之次數(巢狀 describe 亦須各自登記, 較嚴)
        // 本檔自身不掃(其正規式字面值含不成對之引號, 掃描結果不可靠); 本檔之 describe 若未登記, 路徑 A、B 之「由本地副本供應」斷言即轉紅
        tests.filter((fp) => path.basename(fp) !== self).forEach((fp) => {
            let s = codeOf(fp)
            let nDescribe = (s.match(/\bdescribe\(/g) || []).length
            let nUse = (s.match(/\buseCdnLocal\(/g) || []).length
            assert.ok(nDescribe >= 1, `${path.basename(fp)} 未掃到 describe(`)
            assert.ok(nUse >= nDescribe, `${path.basename(fp)} 有 ${nDescribe} 個 describe, 但只登記 ${nUse} 次 useCdnLocal()`)
        })
        let hits = []
        list.forEach((fp) => {
            let name = path.basename(fp)
            if (name === 'cdnLocal.mjs' || name === self) {
                return
            }
            let s = codeOf(fp)
            if (!/\bsetBrowserTypeForTest\(/.test(s)) {
                return
            }
            hits.push(name)
            let rest = s.replace(/\bnextRouted\(next\)/g, '')
            assert.ok(!/\bnext\s*\(/.test(rest), `${name} 之替身以 next() 取得瀏覽器而未經 nextRouted(next)`)
            assert.ok(/\bnextRouted\b/.test(s) || !/\bnext\b/.test(s), `${name} 之替身未使用 nextRouted`)
        })
        // 非空轉: 已知之兩處替身(withPageHook、接線測試)須被掃到
        assert.ok(hits.includes('lib.mjs') && hits.includes('unit-wganttchart-wpw.test.mjs'), `應掃到既有替身之檔: ${hits}`)
    })

})

// 規格: 清單外之外部請求一律中止並使測試失敗(本案刻意製造違規, 故不設每案之違規斷言; 違規留於實例但其後各案之標記晚於本案)
describe('測試不連外部 CDN(表外請求之處置)', function() {

    useCdnLocal({ guard: false })

    it('清單外之外部請求被中止並記為違規, 關閉瀏覽器時拋 E_CDN_EXTERNAL', async function() {
        let mark = cdn.violationMark()
        let url = 'https://cdn-unlisted.invalid/lib.js' // 不可解析之網址, 路由於解析前攔截
        let browser = await wpw.launchChromium()
        let closing = false
        try {
            let failed = []
            let page = await browser.newPage()
            page.on('requestfailed', (r) => failed.push(r.url()))
            await page.setContent(`<script src="${url}"></script>`, { waitUntil: 'networkidle' })
            assert.deepStrictEqual(failed, [url], '清單外之請求應被中止')
            assert.throws(() => cdn.assertNoViolation(mark), (e) => e.code === 'E_CDN_EXTERNAL')
            let vs = cdn.getViolations().slice(mark.n)
            assert.strictEqual(vs.length, 1)
            assert.ok(vs[0].url.includes('cdn-unlisted.invalid'), '違規應記下外部網址')
            closing = true
            await assert.rejects(() => browser.close(), (e) => e.code === 'E_CDN_EXTERNAL')
        }
        finally {
            if (!closing) {
                await browser.close().catch(() => {}) // 斷言先失敗時仍須關閉瀏覽器, 否則 mocha 不結束
            }
        }
    })

    // 規格: 清單外之外部請求使該測試失敗(mocha 層級): 另起一個 mocha 子行程跑夾具測試, 其只含兩案——
    //   ① 頁面載入清單外之網址而「關閉瀏覽器之錯誤被吞掉」(關閉不拋, 僅 useCdnLocal 之每案違規斷言抓得到, 於 after each 掛鉤失敗);
    //   ② 頁面載入清單外之網址而關閉瀏覽器之錯誤未被吞(關閉時拋 E_CDN_EXTERNAL, 該案失敗)
    // 子行程以 W_CDN_OFFLINE=1 跑(快取已備妥, 不連網、不與本行程競爭下載); 夾具寫於 test/_tmp/cdn-guard/ 並於結束時刪除
    it('mocha 層級: 清單外之外部請求使測試失敗(含關閉之錯誤被吞者)', function() {
        this.timeout(180000)
        let dir = path.resolve(__dir, '_tmp', 'cdn-guard')
        let fp = path.join(dir, 'guard.fixture.mjs')
        let src = `import wpw from 'w-playwright'
import { useCdnLocal } from '../../tools/cdnLocal.mjs'
const html = '<script src="https://cdn-unlisted.invalid/lib.js"></script>'
describe('fixture swallowed close', function() {
    useCdnLocal()
    it('external request, close error swallowed', async function() {
        let browser = await wpw.launchChromium()
        let page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle' })
        await browser.close().catch(() => {})
    })
})
describe('fixture close throws', function() {
    useCdnLocal()
    it('external request, close error not swallowed', async function() {
        let browser = await wpw.launchChromium()
        let page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle' })
        await browser.close()
    })
})
`
        let mocha = path.join(path.dirname(createRequire(import.meta.url).resolve('mocha/package.json')), 'bin', 'mocha.js')
        fs.mkdirSync(dir, { recursive: true })
        try {
            fs.writeFileSync(fp, src)
            let r = spawnSync(process.execPath, [mocha, '--no-parallel', fp, '--timeout', '120000'], {
                cwd: process.cwd(), // 快取資料夾相對 process.cwd(), 子行程須與本行程同一個工作目錄
                encoding: 'utf8',
                windowsHide: true,
                env: { ...process.env, W_CDN_OFFLINE: '1' },
                timeout: 150000,
            })
            let out = `${r.stdout || ''}${r.stderr || ''}`
            assert.notStrictEqual(r.status, 0, `夾具測試應失敗(離開碼 ${r.status}): ${out.slice(-600)}`)
            // ① 關閉之錯誤被吞者: 案本身不拋, 由每案之違規斷言於 after each 掛鉤失敗(mocha 之輸出列出掛鉤失敗之案名)
            assert.match(out, /"after each" hook for "external request, close error swallowed"/, `關閉之錯誤被吞者應於 after each 掛鉤失敗: ${out.slice(-800)}`)
            // ② 關閉之錯誤未被吞者: 案本身因關閉時拋違規而失敗(錯誤訊息為共用函式之固定詞彙, 帶外部網址)
            assert.match(out, /close error not swallowed:\s*\n\s*Error: createCdnLocal: [^\n]*cdn-unlisted\.invalid/, `關閉時應拋出帶外部網址之違規: ${out.slice(-800)}`)
        }
        finally {
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

})
