# 回饋

本檔記載任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(只增不改,處置結果另記一列),供主控核實、盤點與整合;提案不等於自行修改,實際修改走通報管道.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-09 | 全域技能 | `role-coder-for-test` §2 第 2 點、`role-coder-for-test-e2e` §3 C9 與 §7.7 | 兩處寫之比對選項為 `includeAA:false`、`threshold:0.1`,未提 pixelmatch 8 之 `checkerboard` 選項(預設 true;透明背景下以棋盤格為底合成後再比)與度量已由 YIQ 改為 OKLab HyAB;建議註明 8 之選項組 `{ includeAA:false, threshold:0.1, checkerboard:true }`,並提示升大版本時度量改變、無選項可還原舊判定,新舊度量之計數以暫裝舊版對照分類 | `node_modules/pixelmatch/index.js:11,18`(OKLab HyAB、`checkerboard=true`);`test/tools/lib.mjs:32` |
| 2026-11-13 | 自有套件 | w-playwright 帳本 R-PW-WIRING 與 README `setBrowserTypeForTest` 段 | 建議於接線測試之範例／規則補一條:替身 `launch(o, next)` 先檢 `o.channel`、`o.executablePath`、`o.headless === false`,不符即拋錯而不呼叫 `next()`——否則使用端日後把啟動點改成系統 Chrome 時,接線測試本身會真啟動 Chrome(才在斷言判紅);本套件已採此寫法 | `test/unit-wganttchart-wpw.test.mjs`(第一案之替身)；`sgud/exp/experience.md` 測試第 8 點 |
| 2026-11-13 | 自有套件 | w-playwright 的受管瀏覽器取得方式 | 只經上層套件間接使用 w-playwright 之終端使用者,要取得受管 headless shell 須自己寫 `import wpw from 'w-playwright'; await wpw.ensureChromium()`(且 w-playwright 須可由其專案解析);建議 w-playwright 提供命令列入口(如 `npx w-playwright install`,內部即 `ensureChromium`),各使用端 README 可一行帶過,且不必再叮嚀「不要用 `npx playwright install`」 | `README.md`「Browser」段(本套件)；w-playwright `README.md` Installation 第 2 點 |
