import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('islandSettings', {
  close: () => ipcRenderer.send('console:close'),
  get: () => ipcRenderer.invoke('settings:get'),
  setIdleMode: (mode: 'float' | 'collapsed') => ipcRenderer.invoke('settings:set-idle-mode', mode),
  setIslandTop: (value: number) => ipcRenderer.invoke('settings:set-island-top', value),
  setMiniScale: (value: number) => ipcRenderer.invoke('settings:set-mini-scale', value),
  setPluginOrder: (ids: string[]) => ipcRenderer.invoke('settings:set-plugin-order', ids),
  plugins: () => ipcRenderer.invoke('host:plugins:list'),
  issues: () => ipcRenderer.invoke('host:plugins:issues'),
  logs: (pluginId: string) => ipcRenderer.invoke('host:plugins:logs', pluginId),
  clearLogs: (pluginId: string) => ipcRenderer.invoke('host:plugins:logs:clear', pluginId),
  reload: (pluginId: string) => ipcRenderer.invoke('host:plugins:reload', pluginId),
  pluginSettings: (pluginId: string) => ipcRenderer.invoke('host:plugins:settings', pluginId),
  setPluginSettings: (pluginId: string, patch: Record<string, unknown>) => ipcRenderer.invoke('host:plugins:settings:set', pluginId, patch),
  setPluginEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('host:plugins:enabled:set', id, enabled),
  uninstall: (id: string) => ipcRenderer.invoke('host:plugins:uninstall', id),
  // 插件安装 / 导出 / Skill 包下载（原插件工坊的功能，已并入控制台「插件」页）。
  pickPluginDirectory: () => ipcRenderer.invoke('plugins:pick-directory'),
  installPlugin: (directory: string) => ipcRenderer.invoke('plugins:install', directory),
  pickPluginPackage: () => ipcRenderer.invoke('plugins:pick-package'),
  installPluginPackage: (filePath: string) => ipcRenderer.invoke('plugins:install-package', filePath),
  exportPluginPackage: (pluginId: string) => ipcRenderer.invoke('plugins:export-package', pluginId),
  downloadSkill: (kind: 'plugin' | 'workbench') => ipcRenderer.invoke('skill:download', kind),
  // 工作台管理（控制台「工作台」页）。工作台和插件是两套东西：这里只做**启用（独占）+ 能力确认**。
  workbenches: () => ipcRenderer.invoke('host:workbenches:list'),
  activateWorkbench: (id: string) => ipcRenderer.invoke('host:workbenches:activate', id),
  acknowledgeWorkbench: (id: string, capabilities: string[]) => ipcRenderer.invoke('host:workbenches:acknowledge', id, capabilities),
  installWorkbench: (directory: string) => ipcRenderer.invoke('host:workbenches:install', directory),
  uninstallWorkbench: (id: string) => ipcRenderer.invoke('host:workbenches:uninstall', id),
  reloadWorkbench: (id: string) => ipcRenderer.invoke('host:workbenches:reload', id),
  workbenchSettings: (id: string) => ipcRenderer.invoke('host:workbenches:settings', id),
  setWorkbenchSettings: (id: string, patch: Record<string, unknown>) => ipcRenderer.invoke('host:workbenches:settings:set', id, patch),
  exportWorkbenchPackage: (id: string) => ipcRenderer.invoke('host:workbenches:export-package', id),
  importWorkbenchPackage: () => ipcRenderer.invoke('host:workbenches:import-package'),
  pickWorkbenchDirectory: () => ipcRenderer.invoke('workbench:pick-directory'),
  onChanged: (listener: (settings: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) => listener(value)
    ipcRenderer.on('settings:changed', handler)
    return () => ipcRenderer.removeListener('settings:changed', handler)
  },
  onTab: (listener: (tab: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, tab: string) => listener(tab)
    ipcRenderer.on('settings:tab', handler)
    return () => ipcRenderer.removeListener('settings:tab', handler)
  },
})
