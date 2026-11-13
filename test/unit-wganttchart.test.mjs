import assert from 'assert'
import wpw from 'w-playwright'
import WGanttchart from '../src/WGanttchart.mjs'
import buildHtml, { PALETTE } from '../src/buildHtml.mjs'
import { isPng, assertBaseline, withPageHook } from './tools/lib.mjs'

// 測試用數據: 虛構之一般性內容
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

// withGantt: 於真瀏覽器載入頁面, 待時間軸繪製完成後執行 fn(page)
async function withGantt(data, fn) {
    let browser = await wpw.launchChromium()
    try {
        let page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
        await page.setContent(buildHtml(data), { waitUntil: 'networkidle' })
        await page.locator('#gantt .vis-item').first().waitFor({ timeout: 15000 })
        return await fn(page)
    }
    finally {
        await browser.close()
    }
}

// 規格來源: src/WGanttchart.mjs 之 JSDoc、src/buildHtml.mjs 檔頭
describe('WGanttchart 甘特圖', function() {

    // 規格: inp 格式 { axisStart, axisEnd, rows }; 日期為 'YYYY-MM-DD'; rows 每項須有 id, label, start, end
    it('inp 不合格式時拋錯', async function() {
        await assert.rejects(() => WGanttchart(null), /invalid inp/)
        await assert.rejects(() => WGanttchart({}), /invalid inp/)
        await assert.rejects(() => WGanttchart({ rows: inp.rows }), /invalid inp\.axisStart/)
        await assert.rejects(() => WGanttchart({ ...inp, axisEnd: '2027/07/01' }), /invalid inp\.axisStart/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [] }), /invalid inp\.rows/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ id: 'a', label: 'x', start: '2026-01-01' }] }), /invalid inp\.rows/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ id: 'a', label: 'x', start: 'abc', end: '2026-01-01' }] }), /invalid inp\.rows/)
    })

    // 規格: rows 一列一橫條, 依序由上而下; label 為左側列標籤
    it('列標籤與橫條依序由上而下', async function() {
        await withGantt(inp, async (page) => {
            let r = await page.evaluate(() => ({
                labels: [...document.querySelectorAll('.vis-labelset .vis-label')].map((el) => ({ t: el.textContent.trim(), top: el.getBoundingClientRect().top })),
                bars: [...document.querySelectorAll('.vis-item.vis-range')].map((el) => el.getBoundingClientRect().top),
            }))
            assert.deepStrictEqual(r.labels.map((v) => v.t), ['需求訪談', '系統開發', '測試驗證', '驗收交付'])
            assert.strictEqual(r.bars.length, 4)
            let sorted = [...r.bars].sort((a, b) => a - b)
            sorted.forEach((top, i) => {
                assert.ok(i === 0 || top > sorted[i - 1], '每列橫條應分處不同高度')
                assert.ok(top >= r.labels[i].top, `第 ${i} 列橫條應落在其標籤列內`)
            })
        })
    })

    // 規格: start/end 為橫條起迄; 時間軸範圍為 axisStart～axisEnd
    it('橫條水平位置與長度依日期成比例', async function() {
        await withGantt(inp, async (page) => {
            let r = await page.evaluate(() => {
                let c = document.querySelector('.vis-panel.vis-center').getBoundingClientRect()
                return {
                    left: c.left,
                    width: c.width,
                    bars: [...document.querySelectorAll('.vis-item.vis-range')].map((el) => {
                        let b = el.getBoundingClientRect()
                        return { left: b.left, right: b.right, cls: [...el.classList].find((v) => v.startsWith('bar-')) }
                    }),
                }
            })
            let t0 = Date.parse(inp.axisStart)
            let t1 = Date.parse(inp.axisEnd)
            let xOf = (d) => r.left + r.width * (Date.parse(d) - t0) / (t1 - t0)
            let kpCls = { a: 'bar-navy', b: 'bar-azure', c: 'bar-sky', d: 'bar-azure' }
            for (let row of inp.rows) {
                let bar = r.bars.find((b) => Math.abs(b.left - xOf(row.start)) < 4 && Math.abs(b.right - xOf(row.end)) < 4 && b.cls === kpCls[row.id])
                assert.ok(bar, `${row.id} 之橫條位置不符, 預期 ${xOf(row.start)}～${xOf(row.end)}`)
            }
        })
    })

    // 規格: cls 色票鍵 navy/azure/sky, 未給或查無視為 azure
    it('橫條配色', async function() {
        let data = { ...inp, rows: [{ ...inp.rows[0], cls: 'navy' }, { ...inp.rows[1], cls: 'sky' }, { ...inp.rows[2], cls: 'red' }] }
        await withGantt(data, async (page) => {
            let colors = await page.evaluate(() => [...document.querySelectorAll('.vis-item.vis-range')].map((el) => {
                let cs = getComputedStyle(el)
                return { cls: [...el.classList].find((v) => v.startsWith('bar-')), bg: cs.backgroundColor }
            }))
            let toRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
            let kp = {}
            colors.forEach((c) => {
                kp[c.cls] = kp[c.cls] || []
                kp[c.cls].push(c.bg)
            })
            assert.deepStrictEqual(kp['bar-navy'], [toRgb(PALETTE.navy.fill)])
            assert.deepStrictEqual(kp['bar-sky'], [toRgb(PALETTE.sky.fill)])
            assert.deepStrictEqual(kp['bar-azure'], [toRgb(PALETTE.azure.fill)], '查無之 cls 應視為 azure')
        })
    })

    // 規格: 時間軸細格一季一格, 主軸標籤為西元純年份; 靜態規劃圖不畫今日線; 橫條不帶文字
    it('時間軸標籤、無今日線、橫條無文字', async function() {
        await withGantt(inp, async (page) => {
            let r = await page.evaluate(() => ({
                major: [...document.querySelectorAll('.vis-time-axis .vis-text.vis-major:not(.vis-measure)')].map((el) => el.textContent.trim()), //.vis-measure 為引擎量字用之隱藏元素
                minor: [...document.querySelectorAll('.vis-time-axis .vis-text.vis-minor:not(.vis-measure)')].map((el) => el.textContent.trim()).filter((v) => v),
                now: document.querySelectorAll('.vis-current-time').length,
                barText: [...document.querySelectorAll('.vis-item.vis-range')].map((el) => el.textContent.trim()).join(''),
            }))
            assert.ok(r.major.includes('2026') && r.major.includes('2027'), `主軸 ${r.major}`)
            assert.ok(r.major.every((v) => /^\d{4}$/.test(v)), `主軸應為純年份 ${r.major}`)
            assert.ok(r.minor.length > 0 && r.minor.every((v) => ['1月', '4月', '7月', '10月'].includes(v)), `細格應一季一格 ${r.minor}`)
            assert.strictEqual(r.now, 0)
            assert.strictEqual(r.barText, '')
        })
    })

    // 規格: label 為純文字, 不成為 HTML; 任何欄位內容皆不得中斷頁面腳本
    it('列標籤逃逸與腳本不中斷', async function() {
        let label = 'A<b>x</b>&</script><script>window.__x=1</script>'
        let id = 'a</script><script>window.__y=1</script>'
        let data = { axisStart: '2026-01-01', axisEnd: '2026-07-01', rows: [{ id, label, start: '2026-01-01', end: '2026-04-01', cls: 'navy' }] }
        await withGantt(data, async (page) => {
            let r = await page.evaluate(() => ({
                text: document.querySelector('.vis-labelset .vis-label').textContent.trim(),
                b: document.querySelectorAll('.vis-labelset b').length,
                x: window.__x,
                y: window.__y,
            }))
            assert.strictEqual(r.text, label)
            assert.strictEqual(r.b, 0)
            assert.strictEqual(r.x, undefined)
            assert.strictEqual(r.y, undefined)
        })
    })

    // 規格: resolve 回傳 PNG 圖之 Buffer; 呼叫端之數據不被改動
    // 預期畫面: 左側四列標籤, 上方時間軸 2026、2027 與季度細格, 四條無文字橫條分為深藍、中藍、淺藍、中藍
    it('產出成品與標準圖', async function() {
        let snap = JSON.stringify(inp)
        let buf = await WGanttchart(inp)
        assert.ok(isPng(buf), '非 PNG')
        assert.strictEqual(JSON.stringify(inp), snap, '改動了 inp')
        assertBaseline(buf, 'gantt')
    })

    // 規格: id 為唯一鍵(JSDoc inp.rows); 不合即 reject, 且須於檢測階段拒絕(不開頁面), 不得等頁面腳本出錯後以逾時收場
    it('rows 之 id 不可重複', async function() {
        let pages = 0
        await withPageHook(() => pages++, async () => {
            await assert.rejects(() => WGanttchart({ ...inp, rows: [inp.rows[0], { ...inp.rows[1], id: inp.rows[0].id }] }), /invalid inp\.rows\[1\]\.id: must be unique/)
        })
        assert.strictEqual(pages, 0, '不應開啟頁面')
    })

    // 規格: 橫條 start、end 為起迄日, end 不可早於 start; 時間軸 axisStart 須早於 axisEnd(JSDoc inp)
    it('橫條迄日不得早於起日、時間軸迄日須晚於起日', async function() {
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ ...inp.rows[0], start: '2026-04-01', end: '2026-01-01' }] }), /invalid inp\.rows\[0\]\.end/)
        await assert.rejects(() => WGanttchart({ ...inp, axisStart: '2027-07-01', axisEnd: '2026-01-01' }), /invalid inp\.axisEnd/)
        await assert.rejects(() => WGanttchart({ ...inp, axisEnd: inp.axisStart }), /invalid inp\.axisEnd/)
    })

    // 規格: 日期須為真實存在之 YYYY-MM-DD(T1 日期字串); 非字串型別、非物件列亦拒
    it('日期須為真實存在之 YYYY-MM-DD, 列須為物件', async function() {
        await assert.rejects(() => WGanttchart({ ...inp, axisStart: '2026-02-30' }), /invalid inp\.axisStart/)
        await assert.rejects(() => WGanttchart({ ...inp, axisStart: '2026-1-1' }), /invalid inp\.axisStart/)
        await assert.rejects(() => WGanttchart({ ...inp, axisStart: new Date('2026-01-01') }), /invalid inp\.axisStart/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ ...inp.rows[0], end: '2026-02-30' }] }), /invalid inp\.rows\[0\]\.end/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ ...inp.rows[0], id: 1 }] }), /invalid inp\.rows\[0\]\.id/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [{ ...inp.rows[0], label: '' }] }), /invalid inp\.rows\[0\]\.label/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: [inp.rows[0], null] }), /invalid inp\.rows\[1\]/)
        await assert.rejects(() => WGanttchart({ ...inp, rows: 'abc' }), /invalid inp\.rows/)
    })

    // 規格: 檢測訊息只帶參數名與索引, 不回顯輸入值(dspec 輸入參數之檢測機制 K9、V20)
    it('檢測訊息不回顯輸入值', async function() {
        let cases = [
            { ...inp, axisStart: 'SECRET-V' },
            { ...inp, rows: [{ ...inp.rows[0], id: 'SECRET-V' }, { ...inp.rows[1], id: 'SECRET-V' }] },
            { ...inp, rows: [{ ...inp.rows[0], start: 'SECRET-V' }] },
            { ...inp, rows: [{ ...inp.rows[0], end: 'SECRET-V' }] },
            { ...inp, rows: [{ ...inp.rows[0], label: 5, id: 'SECRET-V' }] },
        ]
        for (let c of cases) {
            await assert.rejects(() => WGanttchart(c), (e) => {
                assert.ok(!e.message.includes('SECRET-V'), `訊息回顯了輸入值: ${e.message}`)
                return true
            })
        }
    })

    // 規格: cls 查無視為 azure; 原型鏈上之名稱(constructor、toString、__proto__)不是色票鍵
    it('cls 為原型鏈上之名稱時視為 azure', async function() {
        let data = { ...inp, rows: [{ ...inp.rows[0], cls: 'constructor' }, { ...inp.rows[1], cls: 'toString' }, { ...inp.rows[2], cls: '__proto__' }, { ...inp.rows[3], cls: 5 }] }
        await withGantt(data, async (page) => {
            let cls = await page.evaluate(() => [...document.querySelectorAll('.vis-item.vis-range')].map((el) => [...el.classList].find((v) => v.startsWith('bar-'))))
            assert.deepStrictEqual(cls, ['bar-azure', 'bar-azure', 'bar-azure', 'bar-azure'])
        })
    })

    // 規格: 起迄同日之橫條合法(end 不早於 start 即可), 仍繪出一條橫條
    it('起迄同日之橫條可繪出', async function() {
        let data = { axisStart: '2026-01-01', axisEnd: '2026-07-01', rows: [{ id: 'x', label: '單日', start: '2026-02-01', end: '2026-02-01', cls: 'navy' }] }
        await withGantt(data, async (page) => {
            let n = await page.evaluate(() => document.querySelectorAll('.vis-item.vis-range').length)
            assert.strictEqual(n, 1)
        })
    })

})
