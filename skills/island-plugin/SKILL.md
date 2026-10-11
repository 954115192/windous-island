---
name: island-plugin
description: 为 Activity Island（Windows 桌面灵动岛，Electron 应用）生成网页插件。当用户想给灵动岛做插件（时钟、系统状态、媒体控制、通知桥接、番茄钟等）时使用：生成 plugin.json + dist/ 网页 + 可选 PowerShell 后台脚本，遵守三态尺寸与 Apple 风格视觉规范，并指导用户在岛上安装验证。
---

# Activity Island 插件生成

## 任务与产物

在用户指定的工作文件夹里创建插件，产物就是一个普通网页工程：

```text
my-plugin/
├─ plugin.json          # 清单（唯一必填文件）
├─ dist/
│  ├─ index.html        # entry 指向它
│  ├─ app.js
│  └─ style.css
└─ resources/           # 可选：后台脚本（PowerShell / Node）
```

用户安装方式：Activity Island 的「控制台管理 → 插件 → 选择目录安装」选中这个文件夹即可生效；之后改文件会自动热重载。全部完成后运行自检命令（见文末），并把安装步骤告诉用户。

## plugin.json

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "0.1.0",
  "runtime": "web-app",
  "priority": 50,
  "resident": true,
  "entry": "dist/index.html",
  "small":  { "enabled": true, "width": 120, "height": 44 },
  "medium": { "width": 420, "height": 200 },
  "large":  { "width": 640, "height": 340 },
  "settings": { "fields": [ { "key": "city", "label": "城市", "type": "text", "default": "北京" } ] },
  "background": { "entry": "resources/listener.ps1" }
}
```

- `id`：[a-z0-9_-]{1,64}；`version`：x.y 或 x.y.z；`entry` 包内相对路径，禁止 `..`
- `small.width` 按内容收紧（≈ 内容宽 + 28px 内边距），不要声明 150px 这类"保险宽度"
- `resident: true` = 常驻 mini 条；通知型插件用 `resident: false` + `setPresence(false)`
- `settings.fields` 类型：text / password / number / boolean / select / color / textarea，宿主自动渲染表单

## 三态与视觉规范（Apple 风格，必须遵守）

页面 100%×100% 自适应；底色透明或纯黑；**不画**外层圆角、边框、阴影、外层卡片 —— 胶囊外轮廓归宿主。不做 hover 缩放/位移。

| 状态 | 内容内边距 | 区块间距 | 放什么 |
|---|---|---|---|
| small（~40px 高） | 左右 14px | 8px | 只放 [身份图标 18px] + [数值 16px/650] |
| medium | 16px 20px | 12px | 一个主信息 + 一个主操作；卡片 padding 12–14px、圆角 12px |
| large | 24px 28px | 20–24px | 分组信息；危险操作弱化到底部 |

- small 段公式：**[身份标记] + [数值]**，别的全部不要 —— 不放文字标签、日期、副标题、滚动字幕
- 间距按 4/8px 阶梯（4/8/12/16/20/24/28），不要 6/7/9/11
- 图标用 Lucide 风格线性 SVG（24 viewBox、stroke="currentColor"、描边 1.7–1.8、round 端点），**禁止 Emoji 当图标**
- 数字一律 `font-variant-numeric: tabular-nums`；语义色只表达状态：蓝=主操作、绿=正常、橙=警告、红=错误
- CSS 变量用宿主注入的 `--island-ink / --island-ink-dim / --island-accent / --island-font / --island-radius`，不要硬编码黑白

## SDK（window.dynamicIsland，宿主 preload 注入）

```js
const island = window.dynamicIsland
await island.ready                                  // { contractVersion, hostVersion, capabilities, theme, settings }
island.ui.getMode() / island.ui.onModeChange(m => …)  // 'small' | 'medium' | 'large'
island.ui.expand() / island.ui.collapse() / island.ui.close()
island.ui.setPresence(true | false)                 // false = 我现在没内容，别占 mini 条
island.onVisibility(v => …)                         // { visible, reason, rendering }
island.every(1000, render)                          // rendering:false 自动暂停；隐藏不轮询
island.raf(dt => …)                                 // 动画循环，同样自动暂停
island.fitCanvas(canvas, draw)                      // 像素尺寸对齐 devicePixelRatio
island.alert({ key, level, ttl, color })            // 整条覆盖提醒，详见下节
island.focus({ view: 'medium' })                    // 请求独占展开 → onIntent 回执
island.events.on('notify', p => …)                  // 自己后台脚本的事件会发给自己
await island.storage.get/set(key, value)
island.media.command('previous'|'toggle'|'next')    // 全局媒体键，无需后台脚本
island.log.info / warn / error                      // 写日志，控制台可看
island.settings.all() / onChange(v => …)            // 读 settings.fields 的值
```

## 提醒（island.alert）规则

**提醒画面 = 你自己的 small 视图**。宿主只消费 key / level / ttl / color，传入的 title/content/message 一概不渲染 —— 必须在调 `island.alert` **之前**把标题和正文画进 small 视图 DOM，否则用户看到空胶囊。

标准顺序：收到事件 → ① 渲染 small（语义色状态点 + 标题 13px/600 + 正文 11px 用 --island-ink-dim）→ ② `island.alert({ key, level, ttl })` → ③ small 挂点击 → `island.ui.expand()`。

- level：info（完成/恢复，默认 4s）/ warn（偏低/卡住，6s）/ critical（失败/失效，9s）
- color：可选 #RGB/#RRGGBB/#RRGGBBAA 自定义光圈颜色
- key：同 key 新提醒立即覆盖并重置计时；不同 key 排队（上限 3）。进度类滚动更新用固定 key
- 常见错误：只调 alert 不画内容；用"N 秒没收到 ready"判死活（ready 只发一次，热重载后收不到，必然误报）；denied 后无限重试

## 后台脚本（读本机数据 / 联网 / 系统 API）

- `plugin.json` 里**必须**写 `"background": { "entry": "resources/xxx.ps1" }`，不写根本不启动
- .ps1 用 Windows PowerShell 5.1（不是 pwsh 7，WinRT interop 只在 5.1 有）；.js 用 node 跑
- stdout **每行一个 JSON**：`{"type":"state","title":"歌名"}` → 插件 `island.events.on('state', …)`
- 不是 JSON 的行进日志；stderr 进日志；不要往 stdout 打日志/进度条
- **不要往插件目录写文件**（会触发热重载死循环），落盘写 `$env:TEMP`
- stdin 不可用；控制类操作走 `island.media.command()`
- **PowerShell 数组返回**：调用方用 `@(函数名 参数)` 收集；函数内直接 `return $out`，不要 `return ,$out`（嵌套数组会变字符串 "System.Object[]"）
- **吞异常 = 静默丢数据**：空 catch 让故障完全不可见；兜底失败至少往 stderr 写一行原因

### 读取 Windows 通知中心的 WinRT 坑（通知监听类必读）

用 `UserNotificationListener` 读通知时，**不要用 `Visual.GetBinding(...)` 返回的对象调 `GetTextElements()`** —— 实测 PowerShell 5.1 下随机抛 "The object's type must not be a Windows Runtime type"，异常被吞后表现为"通知只剩应用名、没有标题正文"。正确写法是**遍历 `notification.Visual.Bindings` 集合**（实测稳定）：

1. 按 Template 优先选 `'ToastGeneric'` 的绑定，其次任何有文本的绑定
2. 每个绑定调 `GetTextElements()`，第一段文本 = 标题，其余拼接 = 正文
3. 逐元素 try/catch，单元素失败跳过，不要整条放弃
4. 访问状态：`GetAccessStatus()` 1=allowed / 2=denied / 0=unspecified；未授权时调 `RequestAccessAsync()`

## 交互规则（宿主不会代劳的事）

- **small 段的点击自己挂**：容器铺满整个视图（width/height 100%，子元素 pointer-events:none），`onclick → island.ui.expand()` 进中岛；中岛再点 → 大岛；大岛给 `island.ui.collapse()` 入口。漏了 = 用户点插件没反应
- 控制按钮 `stopPropagation()`；参数/日志界面归宿主，**不要**在岛上画设置弹窗
- "有内容才出现"的判断必须**事件驱动**（后台脚本推事件）——被摘下后 `every()` 会暂停，靠轮询醒不过来
- 不要做"点空白处收起"——鼠标移开小岛宿主自己会收

## 自检与安装

```powershell
# 自检（用户装了 Activity Island 时可用；检查宿主加载、运行期错误、日志）
pwsh -File <仓库>\scripts\plugin-smoke.ps1 -PluginDir <插件目录>
```

生成完成后告诉用户：
1. 打开 Activity Island 的「控制台管理 → 插件」页，点「选择目录安装」选中本插件文件夹
2. 之后改文件自动热重载，无需重新安装
3. 分发：插件列表里点「导出」生成 `.islandplugin`，对方在「控制台管理 → 插件 → 导入插件包」直接装
