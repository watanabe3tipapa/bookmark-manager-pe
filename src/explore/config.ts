import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { ExploreConfig } from '../types'

let exploreConfig: ExploreConfig | null = null

function configPath(): string {
  return path.join(app.getPath('userData'), 'explore-config.json')
}

export function getConfig(): ExploreConfig | null {
  return exploreConfig
}

export function hasConfig(): boolean {
  return exploreConfig !== null && exploreConfig.workerUrl.trim().length > 0
}

export function setConfig(config: ExploreConfig): void {
  exploreConfig = { workerUrl: config.workerUrl.trim().replace(/\/+$/, '') }
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true })
    fs.writeFileSync(configPath(), JSON.stringify(exploreConfig, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Explore] Failed to persist config:', err)
  }
}

export function clearConfig(): void {
  exploreConfig = null
  try {
    if (fs.existsSync(configPath())) fs.unlinkSync(configPath())
  } catch (err) {
    console.error('[Explore] Failed to remove config:', err)
  }
}

export function loadConfig(): void {
  try {
    if (fs.existsSync(configPath())) {
      const data = JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as ExploreConfig
      if (data && typeof data.workerUrl === 'string' && data.workerUrl.trim()) {
        exploreConfig = { workerUrl: data.workerUrl.trim().replace(/\/+$/, '') }
      }
    }
  } catch (err) {
    console.error('[Explore] Failed to load config:', err)
  }
}