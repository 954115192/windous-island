export type IslandMode = 'idle' | 'compact' | 'expanded' | 'detail' | 'custom'
export type PluginMode = 'small' | 'medium' | 'large'

export interface PluginSize {
  width?: number
  height?: number
  preferredWidth?: number
  preferredHeight?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface PluginSmallSize extends PluginSize { enabled?: boolean }

export interface PluginSettingField {
  key: string
  label: string
  type?: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'color' | 'textarea'
  description?: string
  placeholder?: string
  default?: unknown
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
}

/** 插件在 plugin.json 里声明的设置项；宿主渲染表单，插件用 island.settings 读写。 */
export interface PluginSettingsSpec { fields: PluginSettingField[] }

export interface PluginManifest {
  id: string
  name: string
  version: string
  entry: string
  runtime?: 'web-app'
  /** mini 段排序权重，越大越靠左（默认 50）。用户拖拽顺序优先于它。 */
  priority?: number
  small?: PluginSmallSize
  medium?: PluginSize
  large?: PluginSize
  settings?: PluginSettingsSpec
  background?: { entry: string }
  resident?: boolean
}

export interface PluginDescriptor {
  manifest: PluginManifest
  rootDir: string
  entryPath: string
}

export interface PluginEventMessage {
  type: 'plugin:event'
  name: string
  payload: unknown
}
