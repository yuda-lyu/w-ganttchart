// 斷網驗收用預載模組(不屬測試檔, 不被 mocha 當測試抓取): 於載入本套件前以 NODE_OPTIONS=--import 預載, 使本行程之瀏覽器與 fetch 皆無法連外
//   ① 包 wpw.launchChromium, 對 Chromium 加 --host-resolver-rules, 使任何主機名稱皆無法解析(回送位址除外);
//   ② 全域 fetch 對非回送位址之 http(s) 拒絕;
//   ③ 環境變數 W_OFFLINE_BLOCK_LOG 指向檔案時, 追加 JSONL 記錄(載入、啟動、被拒之 fetch), 供事後核對「攔截 0 筆」
// 用法(於套件根, 快取 test/_cache/cdn 已備妥): 設 W_CDN_OFFLINE=1 與 NODE_OPTIONS=--import=<本檔之 file: 網址> 後執行 npm test
// 修前(測試未接 CDN 本地副本)於此環境多案轉紅, 修後全綠; 規則帳本 R-GANTT-CDN-02
import fs from 'fs'
import wpw from 'w-playwright'

const LOG = process.env.W_OFFLINE_BLOCK_LOG
const note = (o) => {
    if (LOG) {
        fs.appendFileSync(LOG, JSON.stringify({ pid: process.pid, ...o }) + '\n')
    }
}

const RULE = '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1'
const orig = wpw.launchChromium
wpw.launchChromium = function(opt, ...rest) {
    let o = { ...(opt || {}) }
    o.args = [...(Array.isArray(o.args) ? o.args : []), RULE]
    note({ type: 'launch' })
    return orig.call(wpw, o, ...rest)
}

const prevFetch = globalThis.fetch
globalThis.fetch = function(input, init) {
    let u = typeof input === 'string' ? input : (input && input.url) || String(input)
    if (/^https?:\/\//i.test(u) && !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])([:/]|$)/i.test(u)) {
        note({ type: 'fetch-blocked', url: u })
        return Promise.reject(new TypeError('offlineBlocker: fetch blocked'))
    }
    return prevFetch.call(globalThis, input, init)
}
note({ type: 'loaded', patched: wpw.launchChromium !== orig })
