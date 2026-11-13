# w-ganttchart
A package for gantt chart.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-ganttchart.svg?style=flat)](https://npmjs.org/package/w-ganttchart) 
[![license](https://img.shields.io/npm/l/w-ganttchart.svg?style=flat)](https://npmjs.org/package/w-ganttchart) 
[![npm download](https://img.shields.io/npm/dt/w-ganttchart.svg)](https://npmjs.org/package/w-ganttchart) 
[![npm download](https://img.shields.io/npm/dm/w-ganttchart.svg)](https://npmjs.org/package/w-ganttchart) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-ganttchart.svg)](https://www.jsdelivr.com/package/npm/w-ganttchart)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-ganttchart/w-ganttchart.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-ganttchart
```

### Browser(瀏覽器之取得):

本套件經自有套件 [w-playwright](https://www.npmjs.com/package/w-playwright) 啟動 Playwright 受管之 headless shell(無頭 Chromium)渲染。安裝本套件即帶入 `w-playwright` 與其精確依賴之 `playwright-core` 1.64.1,不需、也不應另裝 `playwright` 或 `playwright-core`。

- **首次使用前須取得受管瀏覽器**:`import wpw from 'w-playwright'` 後執行 `await wpw.ensureChromium()`(`w-playwright` 為本套件之相依套件,通常已在頂層 `node_modules`,否則請 `npm i w-playwright`)。**不要用 `npx playwright install`**(依賴樹中他版被提升時會下載到不同版本之瀏覽器)。未安裝時本套件 reject,其 `code` 為 `E_BROWSER_MISSING`。
- **離線**:於可連網之機器以同版 `w-playwright` 執行 `ensureChromium()`,把 Playwright 之瀏覽器資料夾(Windows 預設 `%LOCALAPPDATA%\ms-playwright` 內之 `chromium_headless_shell-1248`)複製至目標機,並以環境變數 `PLAYWRIGHT_BROWSERS_PATH` 指向該資料夾;此變數須在載入本套件前設定(Playwright 於模組載入時決定瀏覽器目錄)。
- **不使用系統瀏覽器**:本套件只用受管 headless shell,不啟動 Google Chrome、Microsoft Edge 或完整 Chromium,故不需安裝之。
- **守門參數與原因**:`w-playwright` 於每次啟動之命令列一律加入 `--disable-features=<Playwright 預設>,AutofillAiWalletPrivatePasses`(恰一串)。原因:Windows 上 Chromium 153 起,每啟動一個新的瀏覽器根行程,即以無效密碼替目前使用者呼叫一次 `LogonUser`(錯誤密碼次數 +1,本機原則 10 分鐘內 10 次即鎖定帳號),停用該功能即不再發生。本套件啟動之 headless shell 本即不觸發,此參數為一致之防護,不提供停用之選項。
- **不支援之環境變數**:`PWDEBUG`(inspector 模式之值)與 `SELENIUM_REMOTE_URL` 會使上述守門失效,`w-playwright` 一律拒絕(本套件 reject,`code` 為 `E_ENV`)。

## Example

```js
import fs from 'fs'
import WGanttchart from 'w-ganttchart'

let inp = {
    axisStart: '2026-01-01',
    axisEnd: '2027-01-01',
    rows: [
        { id: 'a', label: '需求訪談', start: '2026-01-01', end: '2026-04-01', cls: 'navy' },
        { id: 'b', label: '系統開發', start: '2026-03-01', end: '2026-10-01', cls: 'azure' },
        { id: 'c', label: '驗收交付', start: '2026-10-01', end: '2027-01-01', cls: 'sky' },
    ],
}

fs.writeFileSync('gantt.png', await WGanttchart(inp))
```

## Notes

- 產出 PNG Buffer,經 `w-playwright` 啟動 Playwright 受管之 headless shell 渲染(取得方式見 Browser),解析度為 2 倍。圖內不畫圖名,橫條不帶文字。
- 瀏覽器啟動失敗即 reject:`code` 為 `w-playwright` 之固定詞彙(如 `E_BROWSER_MISSING`、`E_LAUNCH`、`E_LAUNCH_TIMEOUT`、`E_ENV`),訊息不附 Playwright 之原錯誤(改版前為 Playwright 之原錯誤,如 `Executable doesn't exist at …`)。
- 繪圖庫 vis-timeline 由 jsDelivr CDN 載入(版本精確鎖定),產製時須可連線;繪圖庫腳本連線失敗或回應錯誤時 reject(訊息指明原因),不以逾時收場。
- 輸入不合即 reject(訊息只帶參數名與索引,不回顯輸入值):日期須為真實存在之 `YYYY-MM-DD`、`axisEnd` 須晚於 `axisStart`、橫條 `end` 不可早於 `start`、`id` 不可重複。`label` 以純文字呈現。
- 圖內字型固定為微軟正黑體,須於 Windows 或已安裝該字型之環境產製。
- 時間軸細格一季一格,主軸標籤為西元純年份。橫條色票為 navy、azure、sky,未給或查無視為 azure。
