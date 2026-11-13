import assert from 'assert'
import wpw from 'w-playwright'
import WGanttchart from '../src/WGanttchart.mjs'
import { isPng } from './tools/lib.mjs'

// 測試用數據: 虛構之一般性內容(同 unit-wganttchart.test.mjs)
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

// 規格來源: sgud/rule/rulebook.md R-GANTT-PW-01(Chromium 系瀏覽器一律經 w-playwright 啟動), README Notes 與 src/WGanttchart.mjs 檔頭
// 接線測試(w-playwright 帳本 R-PW-WIRING): 本套件只有 src/WGanttchart.mjs 一個啟動點; 以 setBrowserTypeForTest 觀察其送出之選項, 並斷言替身確被呼叫
describe('WGanttchart 啟動經 w-playwright', function() {

    // 規格: 啟動點送出之選項含登入守門(命令列恰一個 --disable-features, 為 args 最後一個元素, 且含 AutofillAiWalletPrivatePasses),
    //       且只用 Playwright 受管之 headless shell(不指定 channel、executablePath, 不有頭)——本套件不啟動真 Chrome、Edge、完整 Chromium
    // 接縫不用替身: 替身以 next() 走真路徑(真啟動 headless shell 一次), 產出須為 PNG
    it('啟動選項含守門且只用受管 headless shell, 並可經 next() 真啟動產圖', async function() {
        let seen = []
        let restore = wpw.setBrowserTypeForTest({
            launch: async (o, next) => {
                seen.push(o)
                if (o.channel !== undefined || o.executablePath !== undefined || o.headless === false) {
                    throw new Error('not a headless shell launch') //安全: 若選項要求真 Chrome、Edge、完整 Chromium 或有頭, 不真啟動, 由下列斷言判紅
                }
                return next()
            },
        })
        let buf
        let err = null
        try {
            buf = await WGanttchart(inp)
        }
        catch (e) {
            err = e
        }
        finally {
            restore()
        }
        assert.strictEqual(seen.length, 1, '替身應被呼叫恰一次(src 之啟動點應經 w-playwright)')
        let o = seen[0]
        assert.strictEqual(o.channel, undefined, '不得指定通道(真 Chrome、Edge)')
        assert.strictEqual(o.executablePath, undefined, '不得指定執行檔')
        assert.notStrictEqual(o.headless, false, '不得有頭')
        let dis = o.args.filter((v) => /^--disable-features=/i.test(v))
        assert.strictEqual(dis.length, 1, `命令列應恰一個 --disable-features: ${JSON.stringify(o.args)}`)
        assert.strictEqual(o.args[o.args.length - 1], dis[0], '合併後之 --disable-features 應為 args 最後一個元素')
        assert.ok(dis[0].split('=')[1].split(',').includes('AutofillAiWalletPrivatePasses'), `缺守門功能: ${dis[0]}`)
        assert.strictEqual(err, null, `經 next() 真啟動應成功: ${err && err.code}`)
        assert.ok(isPng(buf), '非 PNG')
    })

    // 規格: README Notes 與 JSDoc @returns 載明啟動失敗即 reject(帶 code 之 Error, 由 w-playwright 給定); 不以替身以外之途徑啟動
    // 不真啟動瀏覽器: 替身直接拋錯
    it('啟動失敗時 reject(帶 code), 且僅啟動一次', async function() {
        let n = 0
        let restore = wpw.setBrowserTypeForTest({
            launch: async () => {
                n++
                throw new Error('fake launch failure')
            },
        })
        try {
            await assert.rejects(() => WGanttchart(inp), (e) => {
                assert.ok(e instanceof Error)
                assert.match(e.code, /^E_/)
                return true
            })
        }
        finally {
            restore()
        }
        assert.strictEqual(n, 1)
    })

    // 規格: 輸入不合即 reject, 且先於啟動瀏覽器(R-GANTT-API-01 第 3 條); 替身不應被呼叫
    it('輸入不合時不啟動', async function() {
        let n = 0
        let restore = wpw.setBrowserTypeForTest({
            launch: async () => {
                n++
                throw new Error('should not launch')
            },
        })
        try {
            await assert.rejects(() => WGanttchart({ ...inp, axisEnd: inp.axisStart }), /invalid inp\.axisEnd/)
        }
        finally {
            restore()
        }
        assert.strictEqual(n, 0)
    })

})
