import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { chromium } from 'playwright'

// 測試共用層: 像素比對(反鋸齒容差, 補強層)與網頁掛鉤(模擬載入失敗)

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DIR_PICS = path.resolve(__dir, '../pics')
const MAX_DIFF = 100 // 容許之反鋸齒雜訊像素上限
const UPDATE = process.env.UPDATE_BASELINE === '1' // 僅產製標準圖時設定

const isPng = (buf) => Buffer.isBuffer(buf) && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47

// assertBaseline: 與 test/pics/<name>.png 比對; 不符時三聯組證據落 ./testPending/(不覆蓋、不自動刪)
function assertBaseline(buf, name) {
    let fp = path.resolve(DIR_PICS, `${name}.png`)
    if (UPDATE) {
        fs.mkdirSync(DIR_PICS, { recursive: true })
        fs.writeFileSync(fp, buf)
        return
    }
    assert.ok(fs.existsSync(fp), `缺標準圖 ${name}.png`)
    let base = fs.readFileSync(fp)
    let pb = PNG.sync.read(base)
    let pc = PNG.sync.read(buf)
    let same = pb.width === pc.width && pb.height === pc.height
    let diffPng = same ? new PNG({ width: pb.width, height: pb.height }) : null
    let n = same ? pixelmatch(pb.data, pc.data, diffPng.data, pb.width, pb.height, { includeAA: false, threshold: 0.1, checkerboard: true }) : Infinity
    if (n > MAX_DIFF) {
        let dir = path.resolve('testPending')
        let ts = Date.now()
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, `${name}-${ts}-capture.png`), buf)
        fs.writeFileSync(path.join(dir, `${name}-${ts}-baseline.png`), base)
        if (diffPng) {
            fs.writeFileSync(path.join(dir, `${name}-${ts}-diff.png`), PNG.sync.write(diffPng))
        }
        assert.fail(`${name} 與標準圖不符: ${same ? `${n} 像素差` : `尺寸 ${pb.width}x${pb.height} 變為 ${pc.width}x${pc.height}`}, 證據於 ${dir}`)
    }
}

// withPageHook: 執行 fn 期間, 讓被測函式內部開啟之每個頁面先經 hook(page)(如攔截請求以模擬連線失敗); 結束(含拋錯)即還原
// 被測函式自行 chromium.launch()、無注入口(對外無 opt), 故於共用之 chromium 物件掛鉤, 不改 src
async function withPageHook(hook, fn) {
    let orig = chromium.launch
    chromium.launch = async function(...args) {
        let browser = await orig.apply(chromium, args)
        let newPage = browser.newPage.bind(browser)
        browser.newPage = async (...a) => {
            let page = await newPage(...a)
            await hook(page)
            return page
        }
        return browser
    }
    try {
        return await fn()
    }
    finally {
        chromium.launch = orig
    }
}

export { isPng, assertBaseline, withPageHook }
