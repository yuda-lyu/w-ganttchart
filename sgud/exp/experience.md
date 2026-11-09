# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.過長時抽出舊者為`experience_<年月日>.md`,並於本檔註明何時抽出.

## 測試

1. **被測函式自行 `chromium.launch()`、對外無 opt 時,模擬網路失敗用掛鉤,不改 src**:`test/tools/lib.mjs` 之 `withPageHook(hook, fn)` 於 `fn` 執行期間暫時包裝共用 `chromium` 物件之 `launch`,讓其回傳之 browser 的 `newPage` 先對每個頁面執行 `hook(page)`(如 `page.route(/cdn\.jsdelivr\.net/, r => r.abort('namenotresolved'))`),`finally` 還原.src 與測試匯入同一份 `playwright` 模組實例,故掛鉤有效;掛鉤沒生效時,依賴它的測試會因函式正常產圖而紅(不會假綠).
2. **只攔樣式表(`.css`)、不攔腳本**時,輸出與正常位元組相同(`vis-timeline@7.7.3` 之 standalone 腳本已內含樣式),**不是**「無聲走樣」——曾誤以此為前提而把樣式失敗也當載入失敗,實測推翻;只攔腳本時頁面無 `vis`,原型以 15 秒元素等待逾時(訊息不指明原因)收場.攔截回 HTTP 404/5xx 之腳本時,Chromium 另報 `net::ERR_ABORTED` 之 `requestfailed`,訊息須以 HTTP 狀態碼為準.
3. **以「不開頁面」驗證檢測先於副作用**:用 `withPageHook` 計頁面數,斷言為 0;不要用計時斷言(`Date.now()` 差)——負載下會漂移.
4. 變異試驗之作法:在 `./tmp/` 建 `src` + `test` 副本(專案根之 `node_modules` 會被上層解析找到,不需連結),對副本單點改字串,以 `--grep` 只跑對應測試,斷言「有紅」;`MUTATION-NOT-APPLIED`(字串沒替換到)須視為腳本錯誤而非「被殺」.

5. **升 `pixelmatch` 大版本時,先看標準圖與新圖是否位元相同,再談度量差異**(2026-11-09 升 7.2.0 → 8.0.0):8 之色差度量由 YIQ 改為 OKLab HyAB,敏感處在近黑區明度與飽和色色偏,且無選項可還原 7.本套件產出之圖不透明、位元組穩定(同輸入三次產圖與 `gantt.png` 逐位元組相同),故新舊度量計數皆 0,不需重產;若日後標準圖增加(深色、飽和色票)才可能出現「僅度量之差」,屆時先以暫裝舊版對照(`npm i --no-save pixelmatch7@npm:pixelmatch@7.2.0`)分類,再依 R-GANTT-TEST-01 第 4 條處理.
6. **`npm install <套件>` 會順帶同步 `package-lock.json` 頂層 `version` 至 `package.json`,並使 `package.json` 末尾多一個換行**:本套件之 lock 版號原落後 `package.json`,升依賴後 diff 出現與依賴無關之版號行;不屬本次改動時應還原該兩行與末尾換行,免得被誤認為改了版號.

## 環境與工具

1. `quiet-run` 以 cmd 執行指令,`./node_modules/.bin/jsdoc` 之類路徑形式不可用(報「'.' 不是內部或外部命令」);改 `npx jsdoc -c .jsdoc`、`npx eslint ...`.
2. Git Bash 之 `tar -xzf C:/...` 會把 `C:` 當成遠端主機,須加 `--force-local`.
3. 排測試鎖可能等很久(他套件的 e2e 獨佔):前景或有時限的背景指令會把排鎖等待算進逾時而被殺,隊位隨之作廢;改以 `nohup node quiet-run.mjs --lock --timeout 14000 -- ...` 長時限排隊,並把同一輪要跑的驗證併入單一腳本(一次取鎖).腳本內容於取得鎖、node 啟動時才讀入,排隊期間仍可修改.
4. `npm pack` 之 tarball 含 `docs/`(約 34 檔,含字型)與 `docs/dist/`,整包不到 1MB,不需 `.npmignore`.

## 與原實作之差異(承接時審計所得)

1. `cls` 未給時,原實作為 `bar-blue`(淡彩色票之一,已刻意不提供);本套件改為 azure.`cls` 給了但查無時,原實作為 `bar-<未定義>`(引擎預設色),本套件改為 azure.兩者皆為有意之行為變更,但「其餘輸出位元組相同」之敘述對「未給 cls」之列不成立.
3. 原實作對下列輸入**無聲產出壞圖或以不明原因逾時**(實跑):橫條 `end` 早於 `start`(橫條縮成一條細線)、`axisEnd` 不晚於 `axisStart`(時間軸亂掉、橫條被裁)皆回傳 PNG 而不報錯;`id` 重複在頁面內出錯,以 15 秒元素等待逾時收場;全部列落在時間軸範圍外同為 15 秒逾時.前三者已於入口檢測拒絕(R-GANTT-API-01);最後一者仍為逾時(已知限制).
4. 原實作之橫條另有 `font-size: 14px`、`.vis-item-overflow { overflow: visible }`、`.vis-item-content { padding }` 與各色票之文字色;橫條無文字後這些對輸出無影響(以同資料、cls 明給實跑原實作與本套件,位元組相同為證).
