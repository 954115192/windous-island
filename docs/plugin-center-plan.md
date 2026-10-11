# 插件中心（Plugin Center）设计稿

> **状态：设计稿，未实施。** 本文档是已讨论定稿的完整设计方案，留待后续有时间再实施。
> 实施时建议按文末 Phase 0–6 分阶段推进；Phase 1（本地 fixture 中心）可以先行验证 UI。

## 目标

> ⚠️ 写于插件工坊还在的时期。插件工坊与内置 AI 生成已于 2026-10 移除，安装/导入/导出/Skill 下载已并入「控制台管理 → 插件」；本文里涉及工坊窗口的复用方案需要重新设计。

把现有"插件工坊"升级为应用内插件中心：用户可以浏览、搜索、查看详情、轮播截图、查看权限与兼容性、安装/更新插件；登录后可以评分、评论和上传插件。保留现有本地目录安装、插件包导入和 AI 生成能力，不再另起一套安装系统。

默认按推荐方案设计：

- 官方在线插件中心为默认源
- 游客可以浏览和安装
- 登录后才能评分、评论、上传
- 后续预留添加第三方兼容插件中心地址的能力
- 插件不是不可删除的内置组件，安装、启用、禁用、卸载仍由用户控制

## 一、产品结构

复用现有 `console-apps/workshop/index.html` 工坊窗口，新增一级导航：

```text
插件中心
已安装
AI 生成
帮助
```

### 1. 插件中心首页

首页分成以下区域：

- 顶部：搜索框、分类筛选、排序、账号入口、网络状态
- 推荐横幅：官方精选插件，显示主视觉图、简介和安装按钮
- 分类区：效率、媒体、系统、通知、AI、开发者工具
- 内容区：推荐、热门、新发布、评分最高、已安装可更新
- 插件卡片：图标、名称、作者、简述、评分、下载量、标签、版本、安装状态

卡片按钮根据状态变化：

```text
安装
安装中…
已安装
有更新 · 更新
不兼容当前宿主
```

### 2. 插件详情页

点击卡片进入工坊内部详情页，不打开外部网页。结构：

- 返回按钮和插件标题
- 插件图标、名称、作者认证标识、版本、更新时间
- 平均评分、评分数量、下载量
- 主操作：安装 / 更新 / 打开设置 / 卸载
- 截图轮播：大图、左右切换、缩略图、当前页码、键盘左右键
- 简介与功能说明：服务端返回 Markdown，客户端只渲染安全子集
- 使用场景和功能标签
- 兼容性：最低宿主版本、契约版本、支持的 small/medium/large surface
- 权限与风险：后台脚本、网络访问、系统调用、文件/进程能力
- 版本历史和更新说明
- 用户评价：评分分布、评论列表、最新/最有帮助排序
- 举报入口

桌面窗口较窄时，详情页采用"左侧截图 + 右侧信息"；窗口更窄时切换为上下布局。

### 3. 上传发布页

新增"发布插件"入口，采用分步表单，不直接让用户上传后立即公开：

```text
1. 选择 .islandplugin
2. 自动解析并预览 plugin.json
3. 填写名称、简介、详细说明、分类、标签
4. 上传图标和截图，拖拽排序
5. 查看权限、兼容性和安装预览
6. 提交审核
```

上传时显示自动检查结果：

- 包结构和 `plugin.json` 合法性
- id、版本和入口文件
- small/medium/large 声明
- 是否包含后台脚本
- 包大小和资源类型
- 截图数量、尺寸、格式和大小
- 是否检测到可疑路径、运行时垃圾或不允许的文件
- 是否已经存在同 id/版本

提交后状态为：草稿、审核中、需要修改、已发布、已拒绝。用户可以查看审核原因并重新提交。

## 二、服务端数据模型

当前仓库没有插件中心后端，因此新增独立服务目录/仓库，例如独立的 island-marketplace 仓库，不要把账号、评分和上传文件直接写进 Electron 本地目录。

### CatalogItem

```json
{
  "id": "focus-flow",
  "name": "专注节奏",
  "version": "1.0.3",
  "author": { "id": "author-id", "name": "作者名", "verified": true },
  "summary": "一句话简介",
  "descriptionMarkdown": "详细说明",
  "iconUrl": "https://...",
  "screenshots": [
    { "url": "https://...", "width": 1440, "height": 900, "alt": "中岛计时界面" }
  ],
  "categories": ["效率"],
  "tags": ["番茄钟", "专注"],
  "rating": { "average": 4.8, "count": 126, "distribution": [2, 4, 10, 30, 80] },
  "downloads": 3200,
  "updatedAt": "2026-10-06T00:00:00Z",
  "compatibility": { "minHostVersion": "0.2.0", "contractVersion": 2 },
  "permissions": [
    { "key": "process", "label": "后台进程", "risk": "medium", "reason": "读取本机状态" }
  ],
  "release": {
    "packageUrl": "https://.../focus-flow-1.0.3.islandplugin",
    "sha256": "...",
    "size": 123456,
    "signature": "..."
  }
}
```

市场展示元数据以服务端为准；插件包中的 `plugin.json` 仍然是运行时清单，不把完整长描述、评分和评论塞进运行时 manifest。

### 本地安装状态

客户端在现有插件列表基础上合并市场状态：

```text
installedVersion
installedAt
updateAvailable
source: marketplace | local | ai
channel: stable | beta
```

不改变 `PluginManager` 当前的目录扫描和 `sources.json` 机制。

## 三、API 设计

第一版官方 API 建议使用 `/api/v1`：

```text
GET  /catalog/plugins?q=&category=&sort=&page=
GET  /catalog/plugins/:id
GET  /catalog/plugins/:id/versions
GET  /catalog/plugins/:id/reviews?page=&sort=
GET  /catalog/categories
GET  /catalog/featured

POST /auth/device/start
POST /auth/device/poll
POST /auth/logout

POST /catalog/plugins/:id/ratings
PATCH /catalog/plugins/:id/ratings/me
DELETE /catalog/plugins/:id/ratings/me
POST /catalog/plugins/:id/reports

POST /uploads
PUT  /uploads/:uploadId/package
POST /uploads/:uploadId/media
POST /uploads/:uploadId/submit
GET  /uploads/:uploadId
```

客户端网络请求由主进程发出，不让工坊 renderer 直接跨域访问服务端。可以复用现有 `workbenchHttp()` 的超时、响应大小限制和错误返回模式，但插件中心要额外支持 JSON、图片缓存和大包下载。

## 四、安装与安全链路

远程安装不能直接把下载地址交给 renderer，也不能把未经校验的 ZIP 解压到用户插件目录。主进程安装流程：

```text
详情页点击安装
→ 主进程请求 release 元数据
→ HTTPS 下载到临时目录
→ 限制包大小和下载超时
→ 校验 SHA-256
→ 校验签名（官方包）
→ 复用 isZipFile / extractZip 的路径穿越保护
→ 解析 plugin.json
→ 复用 PluginManager 的 id/version/entry 校验
→ 展示权限确认（后台脚本、网络、进程等）
→ 安装到 userData/plugins
→ backgroundManager.start()
→ 复用 showCompact() 和 plugins-changed
→ 写入来源为 marketplace
```

现有可复用模块：

- `electron/plugins/plugin-manager.ts`：发现、manifest 校验、安装、卸载、源码来源
- `electron/plugins/zip.ts`：ZIP 读取、路径穿越过滤、解压
- `electron/main.ts` 的 `installPackage()`：现有插件包安装分流
- `exportArtifactPackage()`：现有插件/工作台打包逻辑
- `electron/plugins/plugin-watcher.ts`：本地开发目录热重载

需要新增的安全规则：

- 远程包必须 HTTPS
- 最大下载体积、最大图片体积、最大截图数量
- SHA-256 必须匹配
- 官方发布包使用签名；签名不匹配禁止安装
- 展示后台脚本和高风险能力后才允许确认安装
- 安装失败要删除临时目录和半成品
- 不执行包内安装脚本、不允许外部 CDN 作为运行时依赖
- 远程 Markdown 必须做白名单渲染，禁止 HTML/脚本注入
- 远程图片先走主进程下载和缓存，转换成本地安全资源或 data URL，避免 `file://` 页面直接跨域加载

## 五、账号、评分与上传规则

### 账号

- 浏览和安装不要求登录
- 评分、评论和上传要求登录
- 推荐使用设备码/浏览器登录，而不是在 Electron 内嵌第三方登录页面
- token 使用 Electron `safeStorage` 保存，不写入普通 `settings.json`
- 未登录时点击评分/上传，显示登录引导，不打断浏览

### 评分

- 1–5 星，允许半星只在服务端展示，不在第一版开放复杂滑杆
- 一个账号对一个插件版本/插件只能有一条评分，可编辑和删除
- 评论可选，支持举报
- 展示平均分、评分总数和 1–5 星分布，不只显示一个大数字
- 排序：最新、最有帮助、评分高/低
- 服务端做频率限制、账号验证、异常评分检测；不采用匿名评分
- 安装/使用后再提示评分，不在首次安装瞬间强弹

### 上传

- 上传者拥有作者页和已发布插件列表
- 插件 id 全局唯一；升级必须递增版本
- 不能覆盖别人已发布的同 id/版本
- 首次发布和高风险能力变更进入审核
- 截图与详情内容服务端做 MIME、尺寸、体积和内容安全检查
- 审核状态可回查，拒绝原因可见

## 六、图片轮播设计

图片不放进 `plugin.json` 运行时清单；上传时作为市场媒体资源单独管理。

规则：

- 图标：SVG/PNG/WebP，建议 512×512，限制体积
- 截图：最多 6 张，建议 16:10 或 16:9，服务端生成缩略图和原图
- 第一张作为详情页主图和列表卡片预览
- 轮播支持左右按钮、缩略图、页码、键盘左右键、Esc 返回
- 图片加载失败显示统一占位，不阻塞详情文本
- 缓存到 `userData/marketplace/cache`，带 ETag/版本号
- 离线时仍可查看最近缓存的详情和图片，并明确标记"离线缓存"

## 七、客户端文件与模块拆分

### 第一阶段复用现有工坊

- `console-apps/workshop/index.html`：新增"插件中心"页、详情页、上传页、轮播组件
- `electron/preload/workshop-preload.ts`：新增 catalog/auth/review/upload/install/update API
- `electron/main.ts`：新增市场请求、缓存、下载、hash/签名校验和安装 handler
- 新建 `electron/plugins/marketplace-client.ts`：API、超时、JSON 校验、缓存、下载
- 新建 `electron/plugins/marketplace-types.ts`：CatalogItem、Review、Upload、Permission、Release 类型
- 新建 `electron/plugins/marketplace-installer.ts`：下载、校验、临时目录、复用 PluginManager 安装
- 新建 `electron/plugins/marketplace-cache.ts`：详情、列表、图片缓存和 ETag

### 第二阶段独立服务

建议独立项目提供：

```text
catalog-api
object storage / CDN
数据库（插件、版本、作者、评分、评论、审核）
后台审核面板
身份认证服务
```

Electron 客户端只依赖稳定的 `/api/v1` 协议，不把服务端数据库逻辑带进桌面端。

## 八、分阶段交付

### Phase 0：协议与安全底座

- 定义 API schema、错误格式、分页格式、版本/兼容性规则
- 定义 `marketplace` 来源状态和本地缓存目录
- 定义包签名/哈希策略
- 定义图片和 Markdown 限制

### Phase 1：本地 fixture 插件中心

- 工坊新增插件中心导航
- 使用本地 `catalog.fixture.json` 渲染首页、搜索、筛选、卡片、详情、轮播
- 详情页安装按钮先复用本地已有导入/安装链路
- 先验证 UI、状态机、轮播和安装状态，不依赖后端

### Phase 2：只读在线目录

- 接入官方 catalog API
- 搜索、分类、排序、详情、截图缓存
- 离线缓存与网络错误状态
- 显示已安装/有更新状态

### Phase 3：安全安装与更新

- 主进程下载、hash、签名、包校验
- 权限确认页
- 安装、升级、回滚、失败清理
- 复用现有插件 watcher、PluginManager、backgroundManager 和 `showCompact()`

### Phase 4：账号、评分与评论

- 浏览/安装游客可用
- 浏览器登录和 safeStorage token
- 评分、编辑、删除、评论、举报、评分分布
- 安装/使用后的非打扰评分提示

### Phase 5：上传与审核

- 上传包、元数据、图标、截图
- 草稿、提交、审核状态、拒绝原因、重新提交
- 作者页和版本历史
- 服务端管理员审核面板

### Phase 6：生态增强

- 多插件中心源配置
- 作者认证、精选榜单、收藏、更新频道
- 推荐系统、兼容性自动检查、崩溃/运行错误反馈
- 版本回滚和灰度发布

## 九、第一版验收

- 工坊可以在"插件中心 / 已安装 / AI 生成 / 帮助"之间切换
- 首页能加载 fixture 或官方目录，搜索/分类/排序有效
- 详情页能展示安全 Markdown、图标、至少 3 张截图轮播、评分分布和权限
- 安装按钮复用现有包安装链路，不产生第二套插件目录
- 安装失败会清理临时文件，不污染 `userData/plugins`
- 评分要求登录，重复评分会更新而不是产生重复记录
- 上传流程能解析包、显示 manifest 预览、上传截图并进入审核状态
- 断网时显示缓存内容和离线状态，不显示空白页面
- `test:pack`、`test:ui`、`test:settings`、新增 `marketplace-ui` 和 `marketplace-install` 测试全部通过
