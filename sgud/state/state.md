# 狀態

本檔記載當前已開發功能之最新狀態(各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本),只記現況、不寫過程(過程寫入`sgud/exp/experience.md`).規則帳本為藍圖(`sgud/rule/rulebook.md`),兩者比對即知尚未做到者.過長時依功能類型拆為`state_<類型>.md`,本檔只留索引.

## 功能現況

| 功能 | 狀態 | 規則帳本 | 測試 |
|---|---|---|---|
| 入口 `WGanttchart(inp)`:正規化甘特數據 → PNG Buffer(經 w-playwright 啟動 Playwright 之 headless shell + vis-timeline,2 倍解析度) | 完成 | R-GANTT-API-01、R-GANTT-LAYOUT-01 | `test/unit-wganttchart.test.mjs` |
| Chromium 系瀏覽器一律經 w-playwright 啟動(`wpw.launchChromium()`,唯一啟動點;不直接依賴 `playwright`／`playwright-core`;只用受管 headless shell;README 載明 `ensureChromium()`、離線、守門參數) | 完成(2026-11-13) | R-GANTT-PW-01 | `test/unit-wganttchart-wpw.test.mjs`(接線測試,含變異)、`test/tools/lib.mjs` 之 `withPageHook`(經 `setBrowserTypeForTest`) |
| 輸入檢測(日期、軸序、列序、id 唯一、型別;訊息不回顯值) | 完成 | R-GANTT-API-01 | 同上 |
| 內容逃逸(label 純文字、嵌入 JSON 之 `<` 逃逸) | 完成 | R-GANTT-ESC-01 | 同上 |
| 繪圖庫載入失敗之明確 reject(連線失敗、HTTP 錯誤、僅樣式缺失) | 完成 | R-GANTT-CDN-01 | `test/unit-wganttchart-load.test.mjs` |
| 版面與標準圖(`test/pics/gantt.png`) | 沿用原型,未重產 | R-GANTT-LAYOUT-01 | `test/unit-wganttchart.test.mjs`「產出成品與標準圖」 |
| 標準圖比對度量(`test/tools/lib.mjs` 之 `assertBaseline`) | 完成:pixelmatch 8.0.0(OKLab HyAB),`{ includeAA: false, threshold: 0.1, checkerboard: true }`,容差 `MAX_DIFF = 100` | R-GANTT-TEST-01 | 同上、`test/unit-wganttchart-load.test.mjs`「僅樣式表失敗仍與標準圖一致」 |
| 發布與建置機制(`script.txt`、`toolg/`、`.gitignore` 等) | 完成,比照先例 | R-GANTT-BUILD-01 | 以 `toolg/` 逐支執行驗證(見下) |

## 已知缺口與待辦

- 全部列皆落在時間軸範圍外時,以 15 秒元素等待逾時 reject(訊息不指明原因);尚未決定是否另加檢測(R-GANTT-API-01 已知限制①).
- CDN 請求懸置(無回應)之逾時訊息為 Playwright 原文(由 `page.setContent` 逾時而來,不經 w-playwright 之啟動錯誤改寫),未以測試覆蓋(R-GANTT-CDN-01 已知限制).
- 受管 headless shell 不自動安裝(不用 `autoInstall`,不隱含網路下載):未安裝時 reject,`code` 為 `E_BROWSER_MISSING`(取得方式見 README);升版 `w-playwright`（其精確釘之 `playwright-core` 版本改變）時,受管瀏覽器之 revision 隨之改變,須重新 `ensureChromium()`,並以標準圖測試確認 0 張改變.
- 標準圖僅 1 張(4 列、含一列未給 `cls`);其他色票或長標籤之標準圖未建.
- 圖內字型為微軟正黑體,Linux 等無該字型環境產出之圖與標準圖不同(測試與標準圖皆於 Windows 產製).

## 最近一次驗證

- 版本: `package.json` 之 `version` 為 1.0.10(版號與發布由使用者之自動化流程處理,agent 不改);依賴 `w-playwright ^1.0.1`(裝 1.0.1,其 `playwright-core` 精確 1.64.1),已無 `playwright`.
- 2026-11-13 遷移至 w-playwright(R-GANTT-PW-01): `npm test` 22 passing(`unit-wganttchart.test.mjs` 13、`unit-wganttchart-load.test.mjs` 6、`unit-wganttchart-wpw.test.mjs` 3),標準圖 0 張改變(「產出成品與標準圖」綠);接線測試修前紅(2 敗)修後綠,三種單點變異(繞過 w-playwright、`channel: 'chrome'`、`headless: false`)皆被抓到;`toolg/gDistRollup.mjs` 實跑通過,`dist` 僅 `require("w-playwright")`,以測試接縫對 dist 煙霧驗證啟動經 w-playwright(`dist` 為發布流程重建物,本輪驗證後還原,未改).
- 測試(遷移前之基準,2026-11-09): `npm test` 19 passing(`unit-wganttchart.test.mjs` 13、`unit-wganttchart-load.test.mjs` 6),連跑 5 次皆 19/0;標準圖 `test/pics/gantt.png`(2520x498)未重產(遷移後見上列 22 passing).
- 比對度量(2026-11-09): `pixelmatch` 由 7.2.0 升至 8.0.0(lock 釘 8.0.0),`assertBaseline` 選項加 `checkerboard: true`,容差不變;升版後全套 19 passing,標準圖 0 張重產;以測試同一份輸入產圖三次,與標準圖逐位元組相同(pixelmatch 8 差異 0 像素、最大通道差 0).
- 變異: 對輸入檢測、載入監看、逃逸、色票預設、版面常數(細格、今日線、列序、橫條文字)共 19 種單點變異,皆被測試抓到.
- 打包: `npm pack` 解開後僅用宣告之依賴安裝,`npm test` 19 passing;裸引用 14 處皆為宣告之依賴且解析於自身 `node_modules`.
- 建置(2026-11-09 全流程;2026-11-13 僅重跑 `toolg/gDistRollup.mjs`): `toolg/cleanFolder.mjs` → `npx jsdoc -c .jsdoc` → `toolg/gDistRollup.mjs` → `toolg/genDocsDist.mjs` 皆通過;`dist/w-ganttchart.umd.js` 載入為函式(現行 `dist` 仍為遷移前建置,僅 `require("playwright")`,待發布流程重建後僅 `require("w-playwright")`).
