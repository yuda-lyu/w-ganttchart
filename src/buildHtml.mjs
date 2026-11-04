// buildHtml: 由正規化甘特數據組出 vis-timeline 網頁; CDN 載入, 需網路
//   inp: { axisStart, axisEnd, rows: [{ id, label, start, end, cls }] }
//     axisStart/axisEnd: 時間軸起迄('YYYY-MM-DD'); rows 一列一橫條, 依序由上而下
//     id: 唯一鍵; label: 左側列標籤; start/end: 橫條起迄('YYYY-MM-DD'); cls: 色票鍵(navy/azure/sky, 未給或查無視為 azure)
//   時間軸細格一季一格, 主軸標籤為西元純年份; 橫條不帶文字, 圖內不畫圖名

const WIDTH = 1200 // 圖寬 px
const STEP_MONTHS = 3 // 時間軸細格月數
const CDN_HOST = 'cdn.jsdelivr.net' // 繪圖庫 vis-timeline 之載入來源(精確鎖定版本, 產製時須可連線)
const VIS_URL = `https://${CDN_HOST}/npm/vis-timeline@7.7.3`

// PALETTE: 橫條色票(填色/邊框), 三階深淺同色系
const PALETTE = {
    navy: { fill: '#1f4e79', stroke: '#153756' },
    azure: { fill: '#2e75b6', stroke: '#1f4e79' },
    sky: { fill: '#5b9bd5', stroke: '#2e75b6' },
}

// esc: HTML 逃逸(vis-timeline 之列標籤以 HTML 呈現)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// clsOf: 色票鍵, 未給或查無視為 azure
const clsOf = (cls) => (Object.prototype.hasOwnProperty.call(PALETTE, cls) ? cls : 'azure')

function buildHtml(inp) {
    // 各色票之 CSS
    let clsCss = Object.entries(PALETTE).map(([k, c]) => `
  .vis-item.bar-${k} { background: ${c.fill}; border-color: ${c.stroke}; }`).join('')

    let data = {
        axisStart: inp.axisStart,
        axisEnd: inp.axisEnd,
        rows: inp.rows.map((r) => ({ id: r.id, label: esc(r.label), start: r.start, end: r.end, cls: clsOf(r.cls) })),
    }

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${VIS_URL}/styles/vis-timeline-graph2d.min.css">
<script src="${VIS_URL}/standalone/umd/vis-timeline-graph2d.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif; background: #ffffff; }
  .wrap { display: inline-block; padding: 26px 30px; background: #ffffff; }
  #gantt { width: ${WIDTH}px; }
  .vis-timeline { border: 1.6px solid #94a7b8; font-family: inherit; }
  .vis-panel.vis-left { border-color: #c3cdd6; }
  .vis-labelset .vis-label { border-color: #e3e9ee; color: #23303a; font-size: 16px; }
  .vis-labelset .vis-label .vis-inner { padding: 8px 12px; }
  .vis-time-axis .vis-text { color: #46525d; font-size: 12.5px; }
  .vis-time-axis .vis-text.vis-major { font-weight: 700; color: #2f4858; font-size: 15px; }
  .vis-grid.vis-minor { border-color: #edf1f4; }
  .vis-grid.vis-major { border-color: #ccd6de; }
  .vis-item { border-width: 1.6px; border-radius: 6px; }
  .vis-item.vis-range { height: 26px; }
${clsCss}
</style>
</head>
<body>
<div class="wrap"><div id="gantt"></div></div>
<script>
  const inp = ${JSON.stringify(data).replace(/</g, '\\u003c')}
  const groups = new vis.DataSet(inp.rows.map((r, i) => ({ id: r.id, content: r.label, order: i })))
  const items = new vis.DataSet(inp.rows.map((r, i) => ({ id: 'r' + i, content: '', start: r.start, end: r.end, group: r.id, type: 'range', className: 'bar-' + r.cls })))
  const options = {
    width: '${WIDTH}px',
    stack: false,
    selectable: false,
    moveable: false,
    zoomable: false,
    orientation: 'top',
    showCurrentTime: false, //靜態規劃圖, 不畫今日線(且會隨產製日變動造成檔案差異)
    margin: { item: 8, axis: 6 },
    groupOrder: 'order',
    start: inp.axisStart,
    end: inp.axisEnd,
    min: inp.axisStart,
    max: inp.axisEnd,
    timeAxis: { scale: 'month', step: ${STEP_MONTHS} },
    format: {
      majorLabels: (d) => String(new Date(d).getFullYear()),
      minorLabels: (d) => (new Date(d).getMonth() + 1) + '月',
    },
  }
  new vis.Timeline(document.getElementById('gantt'), items, groups, options)
</script>
</body>
</html>`
}

export default buildHtml
export { PALETTE, CDN_HOST }
