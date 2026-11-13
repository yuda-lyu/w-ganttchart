import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'

rollupFiles({ //rollupFiles預設會clean folder
    fns: 'WGanttchart.mjs',
    fdSrc,
    fdTar,
    nameDistType: 'kebabCase',
    globals: {
        'w-playwright': 'w-playwright',
    },
    external: [ //Node 端工具之執行期依賴(原生/重資源), 不打包進 dist(w-playwright 精確釘 playwright-core 版本, 打包進來會繞開之); 繪圖庫改由 CDN 於頁面內載入, 非 import, 無須列入
        'w-playwright',
    ],
})
