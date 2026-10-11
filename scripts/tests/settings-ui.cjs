// 控制台管理（settings）的插件页验收：参数/日志必须是内嵌页面，不能是弹窗。
// 隐藏窗口 + 真实 preload + 桩 IPC，断言计算样式与交互结果。
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 用临时 profile：绝不能和你正在跑的那个实例抢同一个 userData（会 ERR_FAILED 加载失败）。
const PROFILE = path.join(os.tmpdir(), 'island-settings-ui', 'profile')
fs.rmSync(path.dirname(PROFILE), { recursive: true, force: true })
fs.mkdirSync(PROFILE, { recursive: true })
app.setPath('userData', PROFILE)

const errors = []
const results = []
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail })
let uninstalled = []
let enabledChanges = []
let pluginEnabled = true

const stub = (channel, handler) => ipcMain.handle(channel, handler)
stub('settings:get', () => ({ idleMode: 'collapsed', islandTop: 5, miniScale: 1, pluginOrder: [] }))
stub('settings:set', () => ({ idleMode: 'collapsed', islandTop: 5, miniScale: 1, pluginOrder: [] }))
stub('settings:set-plugin-order', (_event, order) => ({ idleMode: 'collapsed', islandTop: 5, miniScale: 1, pluginOrder: order }))
stub('host:plugins:list', () => ([
  { id: 'smtc-media', name: '媒体控制', version: '0.3.0', priority: 50, resident: true, enabled: pluginEnabled, sourceDir: 'C:\\dev\\island-plugin\\smtc-media', settings: { fields: [{ key: 'city', label: '城市', type: 'text', default: '北京' }] } },
]))
stub('host:plugins:issues', () => ([]))
stub('host:plugins:enabled:set', (_event, id, enabled) => { pluginEnabled = enabled; enabledChanges.push(`${id}:${enabled}`); return { ok: true, enabled } })
stub('host:plugins:settings', () => ({ ok: true, values: { city: '上海' }, schema: { fields: [{ key: 'city', label: '城市', type: 'text', default: '北京' }] } }))
stub('host:plugins:settings:set', () => ({ ok: true }))
stub('host:plugins:reload', () => ({ ok: false, error: '开发目录里找不到 plugin.json' }))
stub('host:plugins:uninstall', (_event, id) => { uninstalled.push(id); return { ok: true } })
stub('host:plugins:logs', () => ({ lines: ['[info] 已启动', '[warn] 演示日志'] }))

async function main() {
  const win = new BrowserWindow({
    width: 920, height: 660, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'dist-electron', 'preload', 'settings-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  })
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) errors.push(String(message).slice(0, 200)) })
  await win.loadFile(path.join(__dirname, '..', '..', 'console-apps', 'settings', 'index.html'))
  await new Promise((resolve) => setTimeout(resolve, 700))
  const js = (code) => win.webContents.executeJavaScript(code)
  const display = (selector) => js(`getComputedStyle(document.querySelector('${selector}')).display`)

  check('页面无异常', errors.length === 0, errors.join(' | '))
  await js("document.querySelector('[data-tab=\"plugins\"]').click()")
  await new Promise((resolve) => setTimeout(resolve, 500))
  check('插件页列出插件', await js("document.querySelector('#plugin-list').textContent.includes('媒体控制')"))
  await js("document.querySelector('[data-enabled]').click()")
  await new Promise((resolve) => setTimeout(resolve, 300))
  check('插件可以禁用', enabledChanges[0] === 'smtc-media:false' && await js("!document.querySelector('[data-enabled]').checked"))
  await js("document.querySelector('[data-enabled]').click()")
  await new Promise((resolve) => setTimeout(resolve, 300))
  check('插件可以重新启用', enabledChanges[1] === 'smtc-media:true' && await js("document.querySelector('[data-enabled]').checked"))

  // 参数：内嵌展开，不是弹窗
  await js("document.querySelector('[data-settings]').click()")
  await new Promise((resolve) => setTimeout(resolve, 400))
  check('参数通过宿主弹窗显示', await js("!document.querySelector('#plugin-modal').hidden && document.querySelector('#plugin-modal-content .params input[data-key=\"city\"]')?.value === '上海'"))
  check('参数弹窗由控制台宿主统一承载', await js("document.querySelector('#plugin-modal').classList.contains('modal-mask') && !document.querySelector('#plugin-list .modal, #plugin-list [class*=mask]')"))
  await js("document.querySelector('[data-save-params]').click()")
  await new Promise((resolve) => setTimeout(resolve, 400))
  check('保存后有弹窗内反馈', await js("document.querySelector('#plugin-modal-content').textContent.includes('已保存')"))

  // 日志：内嵌卡片
  await js("document.querySelector('[data-logs]').click()")
  await new Promise((resolve) => setTimeout(resolve, 400))
  check('日志通过宿主弹窗显示', await js("!document.querySelector('#plugin-modal').hidden && document.querySelector('#plugin-log-body').textContent.includes('演示日志')"))
  await js("document.querySelector('#plugin-modal-close').click()")
  await new Promise((resolve) => setTimeout(resolve, 200))
  check('日志弹窗可以关闭', await js("document.querySelector('#plugin-modal').hidden"))

  // 重载失败：内嵌提示，不再 alert
  await js("document.querySelector('[data-reload]').click()")
  await new Promise((resolve) => setTimeout(resolve, 400))
  check('重载失败改成内嵌提示', await js("!document.querySelector('#plugin-notice').hidden && document.querySelector('#plugin-notice').textContent.includes('重载失败')"))

  // 卸载：两步确认，不再 confirm
  await js("document.querySelector('[data-uninstall]').click()")
  await new Promise((resolve) => setTimeout(resolve, 200))
  check('卸载第一次点击只变成确认态', await js("document.querySelector('[data-uninstall]').textContent.includes('确认卸载')") && uninstalled.length === 0)
  await js("document.querySelector('[data-uninstall]').click()")
  await new Promise((resolve) => setTimeout(resolve, 500))
  check('第二次点击才真的卸载', uninstalled.length === 1, uninstalled.join(','))
  check('卸载后有内嵌反馈', await js("document.querySelector('#plugin-notice').textContent.includes('已卸载')"))

  // 顶栏固定：下面的插件容器变高时，整页不能被撑出滚动条，把标题和关闭键卷走。
  // 这里直接灌入很多插件行制造溢出，再滚到底看顶栏位置。
  await js(`(() => {
    const list = document.querySelector('#plugin-list')
    const row = list.querySelector('.plugin')
    if (row) for (let i = 0; i < 40; i += 1) list.append(row.cloneNode(true))
    return true
  })()`)
  await new Promise((resolve) => setTimeout(resolve, 200))
  const layout = await js(`(() => {
    const main = document.querySelector('main')
    const bar = document.querySelector('.window-bar')
    main.scrollTop = main.scrollHeight
    const box = bar.getBoundingClientRect()
    return {
      barTop: box.top,
      barBottom: box.bottom,
      mainScrolls: main.scrollHeight > main.clientHeight,
      bodyScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
      documentScrollTop: document.scrollingElement.scrollTop,
      viewport: window.innerHeight,
    }
  })()`)
  check('内容变高后顶栏仍在最顶部（不会被滚走）', layout.barTop === 0, `barTop=${layout.barTop}`)
  check('滚动只发生在内容区，整页不滚动', layout.mainScrolls && !layout.bodyScrolls && layout.documentScrollTop === 0, JSON.stringify(layout))
  check('顶栏高度不变（始终 42px）', Math.round(layout.barBottom) === 42, `barBottom=${layout.barBottom}`)

  // 弹窗不能盖住窗口标题与关闭键（42px 顶栏必须留在遮罩之外）。
  await js("document.querySelector('[data-settings]').click()")
  await new Promise((resolve) => setTimeout(resolve, 300))
  const modal = await js(`(() => {
    const mask = document.querySelector('#plugin-modal')
    const close = document.querySelector('#close')
    const box = mask.getBoundingClientRect()
    const closeBox = close.getBoundingClientRect()
    const topmost = document.elementFromPoint(closeBox.left + closeBox.width / 2, closeBox.top + closeBox.height / 2)
    return { maskTop: box.top, closeTop: closeBox.top, closeHit: close.contains(topmost) || topmost === close }
  })()`)
  check('弹窗遮罩不覆盖窗口顶栏', modal.maskTop >= 42 && modal.closeTop < modal.maskTop, JSON.stringify(modal))
  check('弹窗打开时窗口关闭键仍可点击', modal.closeHit, JSON.stringify(modal))
  await js("document.querySelector('#plugin-modal-close').click()")

  console.log('=== 控制台管理·插件页验收 ===')
  let failed = 0
  for (const item of results) { if (!item.ok) failed += 1; console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `   [${item.detail}]` : ''}`) }
  console.log(`\n${results.length - failed}/${results.length} 通过`)
  win.destroy()
  app.exit(failed ? 1 : 0)
}

app.whenReady().then(main).catch((error) => { console.error(error); app.exit(1) })
