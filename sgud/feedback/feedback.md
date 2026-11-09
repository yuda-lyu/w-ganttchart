# 回饋

本檔記載任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(只增不改,處置結果另記一列),供主控核實、盤點與整合;提案不等於自行修改,實際修改走通報管道.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-09 | 全域技能 | `role-coder-for-test` §2 第 2 點、`role-coder-for-test-e2e` §3 C9 與 §7.7 | 兩處寫之比對選項為 `includeAA:false`、`threshold:0.1`,未提 pixelmatch 8 之 `checkerboard` 選項(預設 true;透明背景下以棋盤格為底合成後再比)與度量已由 YIQ 改為 OKLab HyAB;建議註明 8 之選項組 `{ includeAA:false, threshold:0.1, checkerboard:true }`,並提示升大版本時度量改變、無選項可還原舊判定,新舊度量之計數以暫裝舊版對照分類 | `node_modules/pixelmatch/index.js:11,18`(OKLab HyAB、`checkerboard=true`);`test/tools/lib.mjs:32` |
