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

- 產出 PNG Buffer,以 Playwright 之 Chromium 渲染,解析度為 2 倍。圖內不畫圖名,橫條不帶文字。
- 繪圖庫 vis-timeline 由 jsDelivr CDN 載入(版本精確鎖定),產製時須可連線;繪圖庫腳本連線失敗或回應錯誤時 reject(訊息指明原因),不以逾時收場。
- 輸入不合即 reject(訊息只帶參數名與索引,不回顯輸入值):日期須為真實存在之 `YYYY-MM-DD`、`axisEnd` 須晚於 `axisStart`、橫條 `end` 不可早於 `start`、`id` 不可重複。`label` 以純文字呈現。
- 圖內字型固定為微軟正黑體,須於 Windows 或已安裝該字型之環境產製。
- 時間軸細格一季一格,主軸標籤為西元純年份。橫條色票為 navy、azure、sky,未給或查無視為 azure。
