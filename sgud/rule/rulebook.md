# 規則帳本

本檔為套件設計與開發階段之規則帳本(藍圖),為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.當前已做到哪些記於`sgud/state/state.md`.過長時依類型拆為`rulebook_<類型>.md`,本檔只留索引.

## R-GANTT-API-01 入口 `WGanttchart(inp)`:介面、輸入檢測與失敗通道

- 依據: 本套件定位(由正規化甘特數據產製 PNG);輸入參數之檢測機制(dspec,K2/K9/V19/V20,T1 日期字串;草案);使用者與主控裁定「維持 `WGanttchart(inp)`,不預留 opt」.
- 單一擁有者: `src/WGanttchart.mjs` 之 `check(inp)`.
- 規則:
  1. 預設匯出 `WGanttchart(inp)`(async),回傳 `Promise<Buffer>`(PNG);**無 opt**,不新增選項;主檔不加具名匯出(`dist` 之 UMD 為 `module.exports = 函數`).
  2. 數據 `{ axisStart, axisEnd, rows: [{ id, label, start, end, cls? }] }`;`axisStart`、`axisEnd`、`start`、`end` 為真實存在之 `YYYY-MM-DD`(wsemi `isday`);`id`、`label` 為非空字串.
  3. 檢測項(皆一般參數,必給,不合即 reject,先於開啟瀏覽器):`inp` 須為一般物件;日期格式;`axisStart` 須早於 `axisEnd`;`rows` 非空陣列且每項為物件;`id` 不重複;`label`、`start`、`end` 有效;`start` 不得晚於 `end`(同日合法).
  4. 訊息格式 `invalid <名稱>: must be <種類描述>`(英文、固定詞彙,V19),名稱為參數名或帶索引(`inp.rows[2].end`);**不回顯輸入值**(K9、V20).`cls` 為可省略之鍵:未給或查無視為 azure,不報錯(K3).
  5. 失敗通道: 一律 reject(async 函式內 throw),不同步 throw(dspec 失敗通道 5.1).
  6. 不改動呼叫端之 `inp`.
- 站點全集: 檢測只在 `check()` 一處;`rows[i]` 之鍵 `id/label/start/end/cls` 共 5 個,前 4 個必給並檢測,`cls` 查表.
- 盤點指令: Grep `src/` 搜 `throw new Error` → 每條訊息須為 `invalid ` 或 `failed to load ` 開頭且不含 `${r.` / `${inp.` 之值插值(索引 `${i}` 除外).
- 已知限制: ①列落在時間軸範圍外時由 vis-timeline 裁切,**全部列皆在範圍外**時無橫條可畫,以 15 秒元素等待逾時 reject(Playwright `TimeoutError`,訊息不指明原因);②逾時類(CDN 無回應)由 Playwright 之 `TimeoutError` 收場,訊息為其原文.
- 測試: `test/unit-wganttchart.test.mjs`(「inp 不合格式時拋錯」「rows 之 id 不可重複」「橫條迄日不得早於起日、時間軸迄日須晚於起日」「日期須為真實存在之 YYYY-MM-DD, 列須為物件」「檢測訊息不回顯輸入值」「產出成品與標準圖」).

## R-GANTT-LAYOUT-01 版面與固定行為:不得改動,新需求須先經主責確認

- 依據: 本套件承接原實作之版面,須與原實作產出之圖像素級相同(標準圖 `test/pics/gantt.png`);版面常數與標準圖沿用,要調整者須先經確認,不自行改.
- 單一擁有者: `src/buildHtml.mjs` 之常數與樣式.
- 規則:
  1. 圖寬 `WIDTH = 1200` px;2 倍解析度(`deviceScaleFactor: 2`);圖內不畫圖名;橫條不帶文字(`content: ''`);不畫今日線(`showCurrentTime: false`);`stack: false`;`selectable/moveable/zoomable: false`;`orientation: 'top'`;`margin: { item: 8, axis: 6 }`.
  2. 時間軸細格一季一格(`STEP_MONTHS = 3`,`timeAxis: { scale: 'month', step: 3 }`);主軸標籤為西元純年份;細格標籤為 `N月`.
  3. 字型固定微軟正黑體(`"微軟正黑體", "Microsoft JhengHei", sans-serif`),須於 Windows 或已安裝該字型之環境產製;標準圖亦於此環境產製.
  4. 色票 `PALETTE` 僅 `navy`、`azure`、`sky` 三階藍;`cls` 未給或查無(含原型鏈名稱如 `constructor`、非字串)一律 azure(以 `hasOwnProperty` 判定).
  5. **已刻意不提供,不得補回**: 橫條 `content`、`parts`(分段);`opt.width`、`opt.stepMonths`、`opt.rocYear`;色票 gray、green、teal、orange、blue、purple、red 與其文字色;對外匯出 `buildHtml`(`buildHtml.mjs` 為內部模組,僅供測試匯入).
  6. 標準圖 `test/pics/gantt.png` 只因有效內容改變而重產,且須取得授權;不得為遷就現況而重產.
- 盤點指令: Grep `src/` 搜 `WIDTH|STEP_MONTHS|showCurrentTime|deviceScaleFactor|margin:` 確認常數只有 `buildHtml.mjs`、`WGanttchart.mjs` 各一處;改版面後以標準圖比對(`npm test`)驗證位元級等價於改前之畫面.
- 測試: `test/unit-wganttchart.test.mjs`(「列標籤與橫條依序由上而下」「橫條水平位置與長度依日期成比例」「橫條配色」「時間軸標籤、無今日線、橫條無文字」「cls 為原型鏈上之名稱時視為 azure」「起迄同日之橫條可繪出」「產出成品與標準圖」).

## R-GANTT-ESC-01 數據嵌入頁面之逃逸:label 為純文字,任何欄位不得中斷頁面腳本

- 依據: 原始實作直接 `JSON.stringify` 嵌入 `<script>`,欄位含 `</script>` 即中斷頁面,且 `label` 以 HTML 呈現(vis-timeline 之列標籤以 HTML 解析).
- 單一擁有者: `src/buildHtml.mjs` 之 `esc()` 與資料嵌入處.
- 規則:
  1. `label` 經 `esc()` 逃逸 `&`、`<`、`>` 後交給 vis-timeline(顯示文字等於輸入文字,不成為 HTML).
  2. 嵌入頁面腳本之 JSON 一律 `.replace(/</g, '\\u003c')`,使任何欄位(含 `id`)不能出現 `</script>`.
  3. 兩者缺一不可,測試分別以變異驗證.
- 盤點指令: Grep `src/buildHtml.mjs` 搜 `esc\(|u003c|JSON\.stringify`(嵌入點應只有 `const inp = ${...}` 一處).
- 測試: `test/unit-wganttchart.test.mjs`「列標籤逃逸與腳本不中斷」(`label` 與 `id` 皆放 `</script><script>…`).

## R-GANTT-CDN-01 繪圖庫由 jsDelivr 載入:精確鎖定版本,載入失敗須明確 reject

- 依據: 做法比照 w-flowchart(Node 端以 Playwright 產 PNG、CDN 載第三方);主控裁定「vis-timeline 連網;網路失敗時之錯誤訊息要明確,不得無聲產出空白圖」;dspec〈診斷輸出與遮罩〉D3(套件自身以固定詞彙組成之 reject).
- 單一擁有者: 載入位址於 `src/buildHtml.mjs`(`CDN_HOST`、`VIS_URL`,版本 `vis-timeline@7.7.3` 精確鎖定);載入監看於 `src/WGanttchart.mjs`.
- 規則:
  1. 只載第三方繪圖庫,不載自有套件;產製時須可連線 `cdn.jsdelivr.net`.
  2. 監看繪圖庫腳本(頁面唯一載入之 `.js`)之請求: `requestfailed`(記 Chromium 網路錯誤碼 `net::ERR_*`)與回應狀態 ≥ 400(記 `HTTP nnn`);頁面載入後若有失敗即 reject `failed to load vis-timeline from cdn.jsdelivr.net (<原因>): check network connectivity`(否則腳本缺失時只會在 15 秒元素等待逾時後以不明原因失敗).
  3. 原因只含錯誤碼或狀態碼,**不帶來源回應原文**;回應錯誤時 Chromium 另報 `net::ERR_ABORTED`,以 HTTP 狀態碼為準(不併列).
  4. **樣式表(`.css`)不監看**:實測 `vis-timeline@7.7.3` 之 standalone 腳本已內含樣式,僅攔截樣式表時輸出與正常位元組相同,故其載入失敗不影響結果、不視為失敗(測試以標準圖比對證明).升版時須重新確認此性質.
  5. 升版 vis-timeline 須重產並目視比對標準圖,屬版面變更,依 R-GANTT-LAYOUT-01 先經確認.
- 測試掛鉤: 被測函式自行 `chromium.launch()` 且對外無 opt,故測試以 `test/tools/lib.mjs` 之 `withPageHook(hook, fn)` 於共用之 `chromium` 物件暫時包裝 `launch → newPage`,對每個頁面先執行 `hook(page)`(如 `page.route` 攔截 `cdn.jsdelivr.net` 回 abort/404),結束即還原;不改 src.
- 已知限制: CDN 無回應(請求懸置)時由 Playwright 之 `setContent` 逾時(30 秒)reject,訊息為其原文(不經本套件改寫,亦未以測試覆蓋).
- 測試: `test/unit-wganttchart-load.test.mjs`(全數連線失敗、僅腳本失敗、HTTP 404、HTTP 503 訊息不帶原文、僅樣式表失敗仍與標準圖一致、未攔截可產出).

## R-GANTT-TEST-01 標準圖比對:反鋸齒感知容差,度量為 pixelmatch 8

- 依據: 全域測試規範(語意斷言為主、pixel baseline 為補強層、容差非 byte-exact);使用端對外部依賴保持最新之裁示(Gitea 建議檔「測試之影像比對改用 pixelmatch 8」,主控定案).
- 單一擁有者: `test/tools/lib.mjs` 之 `assertBaseline(buf, name)`(測試檔皆經此比對,不另寫第二份).
- 規則:
  1. 以 `pixelmatch`(devDependencies `^8.0.0`,lock 釘 8.0.0)計差異像素數,選項固定 `{ includeAA: false, threshold: 0.1, checkerboard: true }`;8 之色差度量為 OKLab HyAB(7 為 YIQ),無選項可還原 7 之判定;`checkerboard: true` 為透明背景下以棋盤格為底合成後再比,對本套件不透明之圖無影響.
  2. 容差 `MAX_DIFF = 100` 像素,不放寬、不改 `threshold`;尺寸不同直接失敗;缺標準圖即失敗.
  3. 比對失敗之三聯組證據(capture/baseline/diff)落 `./testPending/`,不覆蓋、不自動刪.
  4. 標準圖只因有效內容改變而重產(`UPDATE_BASELINE=1` 搭 `--grep <案名>`),且須取得授權;度量升版造成之差異,先分類為「僅度量之差」與「內容真改」,前者經目視確認畫面未變且取得授權者才重產,不整批、不放寬容差.
- 盤點指令: Grep `test/` 搜 `pixelmatch\(` 應只有 `test/tools/lib.mjs` 一處;`npm ls pixelmatch` 應為 8.x.
- 測試: `test/unit-wganttchart.test.mjs`「產出成品與標準圖」、`test/unit-wganttchart-load.test.mjs`「僅樣式表失敗仍與標準圖一致」.

## R-GANTT-BUILD-01 發布與建置機制:一律依 dspec,不自創

- 依據: dspec〈自有套件之發布與建置腳本〉(A 型,使用者 2026-11-02 裁示統一機制)、〈自有套件之npm發布範圍〉、〈自有套件之瀏覽器端取用與gh-pages〉.
- 規則:
  1. `script.txt`(使用者維護,agent 不改)與 `toolg/`:`addVersion`、`modifyReadme`、`cleanFolder`、`genDocsDist` 為一行呼叫 w-package-tools 同名函數;`gDistRollup.mjs` 以 `'./src'`、`'./dist'`,呼叫 `rollupFiles`(`fns: 'WGanttchart.mjs'`,`nameDistType: 'kebabCase'`,選項寫於本檔);**不另立**推導路徑、共用設定檔、包裝層.
  2. `playwright` 為 Node 端執行期依賴,列為 `external`/`globals`,不打包進 `dist`;`wsemi` 由 rollup 解析打入;vis-timeline 由 CDN 於頁面內載入,非 import.
  3. 不提供 `.npmignore`: 無外部執行檔,無單一資料夾 ≥ 10MB 之非程式碼資料;npm 包＝git 版控內容(`.gitignore` 保留 `CLAUDE*.md`,不排除 `sgud`).
  4. `dist/`、`docs/`(含 `docs/dist/`)隨先例入版控,由發布流程重建;不手改.
  5. `package.json` 之 `version` 由發布流程遞增,agent 不改;scripts 僅 `test`(`mocha --no-parallel "test/*.test.mjs" --timeout 180000`)與 `deploy`.
- 盤點指令: `node C:/opensrcOper/tools/inventory-build.mjs`(主控工具);本地驗證見 state.md 之建置列.
