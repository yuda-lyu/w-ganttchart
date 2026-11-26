import path from 'path'
import { fileURLToPath } from 'url'
import wpw from 'w-playwright'
import createCdnLocal from 'w-package-tools-e2e/src/createCdnLocal.mjs'

// 測試共用層: 測試開啟之頁面不連外部 CDN(規則帳本 R-GANTT-CDN-02)
// 繪圖庫 vis-timeline 之外部網址由清單(cdn.manifest.json, 含 sha256)釘選, 首次取得後存於內容定址快取 test/_cache/cdn(不入版控), 之後離線可跑;
// 頁面對清單內網址以本地副本回應, 清單外之外部請求一律中止並使測試失敗; 不改 src(產品仍載 CDN, 行為與輸出不變)
// 清單由 tools/genCdnManifest.mjs 依 cdn.roots.json 產生(命令見規則帳本), 網址或版本改變後須重新產生並審視差異

const __dir = path.dirname(fileURLToPath(import.meta.url))
const FP_ROOTS = path.resolve(__dir, 'cdn.roots.json')
const FP_MANIFEST = path.resolve(__dir, 'cdn.manifest.json')

// 快取資料夾用預設(相對 process.cwd() 之 test/_cache/cdn), 測試一律以套件根為工作目錄執行; 離線改以環境變數 W_CDN_OFFLINE=1
const cdn = createCdnLocal({ manifest: FP_MANIFEST })

// useCdnLocal: 於呼叫處之 describe 內登記掛鉤(鉤子之註冊與還原集中於此, 各測試檔不各自註冊);
// before 取得清單內檔案(首次需連網下載, 其後離線)後掛 w-playwright 之啟動後鉤子 wpw.onBrowserCreated, 使其後任何經 w-playwright 啟動之瀏覽器
// (src 之 wpw.launchChromium()、測試內直接之 wpw.launchChromium()、setBrowserTypeForTest 替身內經 next() 取得者)於回傳給呼叫端之前皆已掛本地路由, 各處不必自行包路由;
// after 還原(只移除自己這一份); guard 為真時(預設)每案前後夾 violationMark/assertNoViolation, 自標記起有清單外之外部請求即失敗
function useCdnLocal(opt) {
    let guard = !(opt && opt.guard === false)
    let restore = null
    let mark = null
    before(async function() {
        this.timeout(cdn.hookTimeoutMs) // 取得點之時限對齊下載預算, 不沿用 mocha 全域之 180 秒(其內不啟動瀏覽器, 啟動時限另計)
        await cdn.ensure()
        restore = wpw.onBrowserCreated((t) => cdn.routeBrowser(t))
    })
    after(function() {
        if (restore) {
            restore()
            restore = null
        }
    })
    if (guard) {
        beforeEach(function() {
            mark = cdn.violationMark()
        })
        afterEach(function() {
            cdn.assertNoViolation(mark)
        })
    }
}

export { cdn, useCdnLocal, FP_ROOTS, FP_MANIFEST }
