import assert from 'assert'
import WGanttchart from '../src/WGanttchart.mjs'
import { isPng, assertBaseline, withPageHook } from './tools/lib.mjs'

// 測試用數據: 虛構之一般性內容(同 unit-wganttchart.test.mjs, 以便與標準圖比對)
const inp = {
    axisStart: '2026-01-01',
    axisEnd: '2027-07-01',
    rows: [
        { id: 'a', label: '需求訪談', start: '2026-01-01', end: '2026-04-01', cls: 'navy' },
        { id: 'b', label: '系統開發', start: '2026-03-01', end: '2026-12-01', cls: 'azure' },
        { id: 'c', label: '測試驗證', start: '2026-10-01', end: '2027-03-01', cls: 'sky' },
        { id: 'd', label: '驗收交付', start: '2027-03-01', end: '2027-07-01' },
    ],
}

// 規格來源: src/WGanttchart.mjs 檔頭與 JSDoc(@returns): 繪圖庫腳本(jsDelivr 之 vis-timeline)載入失敗即 reject 並指明原因, 不以不明原因逾時收場
// 模擬連線失敗: 以 withPageHook 於被測函式開啟之頁面攔截對 cdn.jsdelivr.net 之請求(被測函式無注入口, 不改 src)
describe('WGanttchart 繪圖庫載入失敗', function() {

    // 規格: 載入失敗之訊息須指明繪圖庫、來源主機與原因(Chromium 網路錯誤碼)
    it('繪圖庫全數連線失敗時 reject 並指明原因', async function() {
        await withPageHook((page) => page.route(/cdn\.jsdelivr\.net/, (r) => r.abort('namenotresolved')), async () => {
            await assert.rejects(() => WGanttchart(inp), (e) => {
                assert.match(e.message, /^failed to load vis-timeline from cdn\.jsdelivr\.net \(net::ERR_NAME_NOT_RESOLVED\): check network connectivity$/)
                return true
            })
        })
    })

    // 規格: 同上; 腳本缺失時頁面無 vis, 不得以逾時(15 秒後之元素等待逾時, 訊息不指明原因)收場
    it('僅繪圖庫腳本連線失敗時 reject 並指明原因', async function() {
        await withPageHook((page) => page.route(/cdn\.jsdelivr\.net.*\.js$/, (r) => r.abort('connectionrefused')), async () => {
            await assert.rejects(() => WGanttchart(inp), /^Error: failed to load vis-timeline from cdn\.jsdelivr\.net \(net::ERR_CONNECTION_REFUSED\)/)
        })
    })

    // 規格: 同上; 來源回應 HTTP 錯誤(版本被撤、服務錯誤)亦屬載入失敗; 原因以狀態碼為準(Chromium 另報之 ERR_ABORTED 不併入)
    it('繪圖庫回應 HTTP 錯誤時 reject 並指明狀態碼', async function() {
        await withPageHook((page) => page.route(/cdn\.jsdelivr\.net/, (r) => r.fulfill({ status: 404, body: 'not found' })), async () => {
            await assert.rejects(() => WGanttchart(inp), /^Error: failed to load vis-timeline from cdn\.jsdelivr\.net \(HTTP 404\): check network connectivity$/)
        })
    })

    // 規格: 訊息只含固定詞彙, 不帶外來原文(dspec 診斷輸出與遮罩 D3: 套件自身以固定詞彙組成之 reject)
    it('訊息不帶來源回應之原文', async function() {
        await withPageHook((page) => page.route(/cdn\.jsdelivr\.net/, (r) => r.fulfill({ status: 503, body: 'SECRET-BODY', headers: { 'x-secret': 'SECRET-HDR' } })), async () => {
            await assert.rejects(() => WGanttchart(inp), (e) => {
                assert.match(e.message, /\(HTTP 503\)/)
                assert.ok(!/SECRET/.test(e.message), `訊息帶出了來源回應: ${e.message}`)
                return true
            })
        })
    })

    // 規格: 圖與標準圖一致; vis-timeline 之 standalone 腳本已內含樣式, 同頁之樣式表(.css)僅載入失敗時輸出不變, 不視為載入失敗
    it('僅樣式表連線失敗時仍產出與標準圖一致之圖', async function() {
        await withPageHook((page) => page.route(/cdn\.jsdelivr\.net.*\.css$/, (r) => r.abort('failed')), async () => {
            let buf = await WGanttchart(inp)
            assert.ok(isPng(buf), '非 PNG')
            assertBaseline(buf, 'gantt')
        })
    })

    // 規格: 掛鉤不影響正常流程(對照: 未攔截時可產出 PNG, 證明上列失敗源於攔截而非輸入)
    it('未攔截時可正常產出', async function() {
        let pages = 0
        let buf = await withPageHook(() => pages++, () => WGanttchart(inp))
        assert.strictEqual(pages, 1)
        assert.ok(isPng(buf), '非 PNG')
    })

})
