import { DeviceEventEmitter } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import TorrentModule, { type TorrentModuleInterface } from "../modules/TorrentModule"

// Download model interface
export interface DownloadModel {
  _id: string
  downloadedSize: number
  downloadRate: number
  name: string
  peers: number
  progress: number
  seeders: number
  source: string
  status: "DOWNLOADING" | "PAUSED" | "COMPLETED" | "ERROR"
  totalSize: number
  location?: string
}

// Interface for AsyncStorage database operations
export interface IAsyncStorageDatabase {
  getAll(): Promise<DownloadModel[]>
  getAllByFilters(filters: Partial<DownloadModel>): Promise<DownloadModel[]>
  get(id: string): Promise<DownloadModel | null>
  create(data: Partial<DownloadModel>): Promise<DownloadModel>
  update(id: string, data: Partial<DownloadModel>): Promise<void>
  delete(id: string): Promise<void>
  addObjectsListener(callback: (data: DownloadModel[]) => void): () => void
  addObjectListener(id: string, callback: (data: DownloadModel) => void): () => void
}

// Implementation of AsyncStorage database
class AsyncStorageDatabase implements IAsyncStorageDatabase {
  private storageKey = "downloads"
  private listeners: Map<string, Set<(data: DownloadModel) => void>> = new Map()
  private globalListeners: Set<(data: DownloadModel[]) => void> = new Set()

  // Generate a unique ID for new downloads
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  // Get all downloads from AsyncStorage
  public async getAll(): Promise<DownloadModel[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(this.storageKey)
      return jsonValue != null ? JSON.parse(jsonValue) : []
    } catch (e) {
      console.error("Error reading downloads from AsyncStorage:", e)
      return []
    }
  }

  // Get downloads that match the given filters
  public async getAllByFilters(filters: Partial<DownloadModel>): Promise<DownloadModel[]> {
    const downloads = await this.getAll()
    return downloads.filter((download) => {
      return Object.entries(filters).every(([key, value]) => download[key] === value)
    })
  }

  // Get a specific download by ID
  public async get(id: string): Promise<DownloadModel | null> {
    const downloads = await this.getAll()
    return downloads.find((download) => download._id === id) || null
  }

  // Create a new download
  public async create(data: Partial<DownloadModel>): Promise<DownloadModel> {
    const downloads = await this.getAll()
    const newDownload: DownloadModel = {
      _id: this.generateId(),
      ...data,
    } as DownloadModel

    downloads.push(newDownload)
    await this.saveDownloads(downloads)
    this.notifyListeners()

    return newDownload
  }

  // Update an existing download
  public async update(id: string, data: Partial<DownloadModel>): Promise<void> {
    const downloads = await this.getAll()
    const index = downloads.findIndex((download) => download._id === id)

    if (index !== -1) {
      downloads[index] = { ...downloads[index], ...data }
      await this.saveDownloads(downloads)
      this.notifyListeners()
      this.notifyObjectListeners(id, downloads[index])
    }
  }

  // Delete a download
  public async delete(id: string): Promise<void> {
    const downloads = await this.getAll()
    const filteredDownloads = downloads.filter((download) => download._id !== id)

    await this.saveDownloads(filteredDownloads)
    this.notifyListeners()

    // Remove any listeners for this object
    this.listeners.delete(id)
  }

  // Add a listener for all downloads
  public addObjectsListener(callback: (data: DownloadModel[]) => void): () => void {
    this.globalListeners.add(callback)

    // Immediately notify with current data
    this.getAll().then((downloads) => {
      callback(downloads)
    })

    // Return a function to remove the listener
    return () => {
      this.globalListeners.delete(callback)
    }
  }

  // Add a listener for a specific download
  public addObjectListener(id: string, callback: (data: DownloadModel) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set())
    }

    this.listeners.get(id)!.add(callback)

    // Immediately notify with current data
    this.get(id).then((download) => {
      if (download) {
        callback(download)
      }
    })

    // Return a function to remove the listener
    return () => {
      const listeners = this.listeners.get(id)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(id)
        }
      }
    }
  }

  // Save downloads to AsyncStorage
  private async saveDownloads(downloads: DownloadModel[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(downloads)
      await AsyncStorage.setItem(this.storageKey, jsonValue)
    } catch (e) {
      console.error("Error saving downloads to AsyncStorage:", e)
    }
  }

  // Notify all global listeners
  private notifyListeners(): void {
    if (this.globalListeners.size > 0) {
      this.getAll().then((downloads) => {
        this.globalListeners.forEach((listener) => {
          listener(downloads)
        })
      })
    }
  }

  // Notify listeners for a specific download
  private notifyObjectListeners(id: string, download: DownloadModel): void {
    const listeners = this.listeners.get(id)
    if (listeners) {
      listeners.forEach((listener) => {
        listener(download)
      })
    }
  }
}

// Download Manager class
export default class DownloadManager {
  private static instance: DownloadManager
  private downloadDb: IAsyncStorageDatabase
  private torrentService: TorrentModuleInterface

  private constructor() {
    this.downloadDb = new AsyncStorageDatabase()
    this.torrentService = TorrentModule
  }

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager()
      DownloadManager.instance.addTorrentListeners()
    }
    return DownloadManager.instance
  }

  public getDownloadsListener(callback: (data: DownloadModel[]) => void) {
    return this.downloadDb.addObjectsListener(callback)
  }

  public getDownloadListener(downloadId: string, callback: (data: DownloadModel) => void) {
    return this.downloadDb.addObjectListener(downloadId, callback)
  }

  public async add(magnetLink: string) {
    const download = await this.downloadDb.create({
      downloadedSize: 0,
      downloadRate: 0,
      name: "Searching...",
      peers: 0,
      progress: 0,
      seeders: 0,
      source: magnetLink,
      status: "DOWNLOADING",
      totalSize: 0,
    })
    this.torrentService.add(download._id, magnetLink)
    return download
  }

  public async pause(downloadId: string) {
    try {
      await this.torrentService.pause(downloadId)
    } catch (error) {
      console.error(error)
    }
    await this.downloadDb.update(downloadId, { status: "PAUSED" })
  }

  public async resume(downloadId: string) {
    try {
      await this.torrentService.resume(downloadId)
    } catch (error) {
      console.error(error)
      const download = await this.downloadDb.get(downloadId)

      if (!download) {
        console.error("Download not found")
        return
      }

      const magnetLink = download.source
      this.torrentService.add(downloadId, magnetLink)
    }
    await this.downloadDb.update(downloadId, { status: "DOWNLOADING" })
  }

  public async restart(downloadId: string) {
    const download = await this.downloadDb.get(downloadId)

    if (!download) {
      console.error("Download not found")
      return
    }

    const magnetLink = download.source
    console.log("Starting Torrent...")
    this.torrentService.add(downloadId, magnetLink)
    await this.downloadDb.update(downloadId, { status: "DOWNLOADING" })
  }

  public async pauseUnfinishedDownloads() {
    const downloads = await this.downloadDb.getAllByFilters({
      status: "DOWNLOADING",
    })
    console.log("Pausing Torrent downloads...")
    console.log(`UNFINISHED_DOWNLOADS: ${downloads.length}`, downloads)
    for (const download of downloads) {
      this.pause(download._id)
    }
  }

  public async remove(downloadId: string) {
    try {
      const download = await this.downloadDb.get(downloadId)

      if (!download) {
        console.error("Download not found")
        return
      }

      if (download.location) {
        await this.torrentService.remove(downloadId, download.location)
      }

      this.downloadDb.delete(downloadId)
    } catch (error) {
      console.error(error)
    }
  }

  public addTorrentListeners() {
    DeviceEventEmitter.addListener("ADD_TORRENT", (data) => console.log("Add torrent: ", data))
    DeviceEventEmitter.addListener("TORRENT_INFO", (data) => {
      console.log("Torrent info: ", data)
      this.addTorrentInfo(data.downloadId, data)
    })
    DeviceEventEmitter.addListener("PIECE_FINISHED", (data) => {
      this.updateDownload(data.downloadId, data)
    })
    DeviceEventEmitter.addListener("TORRENT_FINISHED", (data) => {
      console.log("Torrent finished: ", data)
      this.finishDownload(data.downloadId)
    })
    DeviceEventEmitter.addListener("TORRENT_ERROR", (data) => {
      console.error("Torrent Error: ", data)
      this.updateDownloadToError(data.downloadId)
    })
    DeviceEventEmitter.addListener("ADD_ERROR", (data) => {
      console.error("Add Error: ", data)
      this.updateDownloadToError(data.downloadId)
    })
  }

  private async addTorrentInfo(downloadId: string, info: any) {
    await this.downloadDb.update(downloadId, {
      name: info.name,
      location: info.folderLocation,
      totalSize: info.totalSize,
    })
  }

  private async updateDownload(downloadId: string, data: any) {
    await this.downloadDb.update(downloadId, {
      downloadedSize: data.downloadedSize,
      downloadRate: data.downloadRate,
      peers: data.peers,
      progress: data.progress,
      seeders: data.seeders,
    })
  }

  private async finishDownload(downloadId: string) {
    const download = await this.downloadDb.get(downloadId)

    if (!download) {
      console.error("Download not found")
      return
    }

    await this.downloadDb.update(downloadId, {
      downloadedSize: download.totalSize,
      downloadRate: 0,
      peers: 0,
      progress: 100,
      seeders: 0,
      status: "COMPLETED",
    })
  }

  private async updateDownloadToError(downloadId: string) {
    await this.downloadDb.update(downloadId, {
      status: "ERROR",
    })
  }
}

