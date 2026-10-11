// __NAME__ —— 插件模板。
//
// 契约速查（全文见 docs/plugin-contract.md）：
// - 页面必须 100% × 100% 自适应；底色保持透明或纯黑，不要画外层圆角/边框/阴影。
// - hover 与展开动画由宿主负责，插件不要自己做缩放或位移。
// - 隐藏时不要轮询：用 island.every() / island.raf()。
// - 主题色用 CSS 变量 --island-* ，不要硬编码颜色。
const island = window.dynamicIsland
const root = document.querySelector('#app')
const app = { count: 0, mode: island?.ui.getMode?.() ?? 'small', settings: {} }

// 插件参数：plugin.json 的 settings.fields 里声明，用户在宿主控制台（或插件自己的界面）填写。
// 这里读同一份数据，并在用户改动时立刻重绘。
island?.settings?.all?.().then(values => { app.settings = values; render() })
island?.settings?.onChange?.(values => { app.settings = values; render() })

function render() {
  const greeting = app.settings.greeting || '你好'
  const accent = app.settings.accent
  if (accent) document.documentElement.style.setProperty('--island-accent', accent)
  if (app.mode === 'small') {
    root.innerHTML = `<button class="small" id="expand"><b>${app.count}</b><small>${greeting}</small></button>`
    root.querySelector('#expand').onclick = () => island.ui.expand()
  } else if (app.mode === 'medium') {
    root.innerHTML = `<button class="medium" id="expand"><small>COUNT</small><b>${app.count}</b><small class="hint">${greeting} · 点击进入大岛</small></button>`
    root.querySelector('#expand').onclick = () => island.ui.expand()
  } else {
    root.innerHTML = `<section class="large"><h1>${app.count}</h1><small>刷新间隔 ${app.settings.interval ?? 1}s</small><div class="actions"><button id="collapse">收起</button><button id="alert">发一条提醒</button></div></section>`
    root.querySelector('#collapse').onclick = () => island.ui.collapse()
    root.querySelector('#alert').onclick = () => island.alert({ key: 'count', level: 'info', ttl: 3000 })
  }
}

island?.ui.onModeChange((mode) => { app.mode = mode; render() })
// 只在岛上可见时跑；被隐藏会自动暂停，重新可见立刻补跑一次。
island?.every(1000, () => { app.count += 1; render() })
island?.ready.then((hello) => {
  island.log.info(`__ID__ 已接入契约 v${hello?.contractVersion}，宿主 ${hello?.hostVersion}`)
})
render()
