# 回饋

本檔記載任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(只增不改,處置結果另記一列),供主控核實、盤點與整合;提案不等於自行修改,實際修改走通報管道.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-09 | 全域技能 | `role-coder-for-test` §2 第 2 點、`role-coder-for-test-e2e` §3 C9 與 §7.7 | 兩處寫之比對選項為 `includeAA:false`、`threshold:0.1`,未提 pixelmatch 8 之 `checkerboard` 選項(預設 true;透明背景下以棋盤格為底合成後再比)與度量已由 YIQ 改為 OKLab HyAB;建議註明 8 之選項組 `{ includeAA:false, threshold:0.1, checkerboard:true }`,並提示升大版本時度量改變、無選項可還原舊判定,新舊度量之計數以暫裝舊版對照分類 | `node_modules/pixelmatch/index.js:11,18`(OKLab HyAB、`checkerboard=true`);`test/tools/lib.mjs:32` |
| 2026-11-13 | 自有套件 | w-playwright 帳本 R-PW-WIRING 與 README `setBrowserTypeForTest` 段 | 建議於接線測試之範例／規則補一條:替身 `launch(o, next)` 先檢 `o.channel`、`o.executablePath`、`o.headless === false`,不符即拋錯而不呼叫 `next()`——否則使用端日後把啟動點改成系統 Chrome 時,接線測試本身會真啟動 Chrome(才在斷言判紅);本套件已採此寫法 | `test/unit-wganttchart-wpw.test.mjs`(第一案之替身)；`sgud/exp/experience.md` 測試第 8 點 |
| 2026-11-13 | 自有套件 | w-playwright 的受管瀏覽器取得方式 | 只經上層套件間接使用 w-playwright 之終端使用者,要取得受管 headless shell 須自己寫 `import wpw from 'w-playwright'; await wpw.ensureChromium()`(且 w-playwright 須可由其專案解析);建議 w-playwright 提供命令列入口(如 `npx w-playwright install`,內部即 `ensureChromium`),各使用端 README 可一行帶過,且不必再叮嚀「不要用 `npx playwright install`」 | `README.md`「Browser」段(本套件)；w-playwright `README.md` Installation 第 2 點 |
| 2026-11-25 | 全域技能 | `role-coder-for-test`(本機已同步版僅有 §5.1,無「測試不連外部 CDN」一節) | 本輪依派工摘要之要點實作;同步後請對照並補入實測要點:①`setBrowserTypeForTest` 之替身為堆疊(`next()` 直達真 BrowserType),自設替身者須各自經 `nextRouted(next)` 掛路由,只裝一個基底替身會漏接;②「違規使測試失敗」須有 mocha 層級案(每案違規斷言為 `close()` 拋錯之備援,變異拿掉它會存活);③盤點掃描須先去註解與字串字面值;④掛路由失敗須關閉已啟動之瀏覽器再拋(w-playwright 會把替身內之拋錯改寫為 `E_LAUNCH`) | `test/tools/cdnLocal.mjs`;`test/unit-wganttchart-cdn.test.mjs`;`sgud/exp/experience.md` 測試第 10 點 |
| 2026-11-25 | 自有套件 | w-playwright `setBrowserTypeForTest` 之說明 | 文件為「多次設定時以最後設定且未還原者生效」,語意為替換、非疊放(替身內 `next()` 不經下層替身);外部說法「可疊放」易誤解;建議 README 明示「替身不串接,需疊加行為者須於各替身內自行包裝」,或提供「browser 建立後之鉤子」 | `node_modules/w-playwright/src/setBrowserTypeForTest.mjs:13-14`;`node_modules/w-playwright/src/_launchCore.mjs:294-311` |
| 2026-11-25 | 自有套件 | w-package-tools-e2e `createCdnLocal` 之使用端接線 | 使用端須自寫約 25 行 mocha 接線(`before` 取得、安裝替身、每案違規標記、掛路由失敗時關閉瀏覽器)與盤點測試;建議共用庫提供 `routeLaunch(next)`(含失敗時關閉瀏覽器)與 mocha 輔助(同 `useCdnLocal` 之形)或接線範例,使各庫不各寫一份 | `test/tools/cdnLocal.mjs` |
| 2026-11-25 | 自有套件 | w-package-tools-e2e 之依賴 | `sharp`(含各平台原生可選套件)為其 `dependencies`,使只用 `createCdnLocal` 之使用端的 `package-lock.json` 多約 660 行(`npm i -D` 後 +662);建議確認是否宜改為選配或拆出標準圖工具 | 該套件 `package.json` 之 `dependencies`;`git diff --stat -- package-lock.json` |
