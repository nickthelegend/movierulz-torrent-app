"use client"

import { useState, useEffect, useCallback } from "react"
import DownloadManager from "./downloadManager"
import type { DownloadModel } from "./downloadManager"

// Hook for accessing all downloads
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const downloadManager = DownloadManager.getInstance()

    // Set up listener that will update state when downloads change
    const unsubscribe = downloadManager.getDownloadsListener((newDownloads) => {
      setDownloads(newDownloads)
      setLoading(false)
    })

    // Clean up listener on unmount
    return () => {
      unsubscribe()
    }
  }, []) // Empty dependency array ensures this only runs once

  // Methods to interact with downloads
  const addDownload = useCallback(async (magnetLink: string) => {
    const downloadManager = DownloadManager.getInstance()
    return await downloadManager.add(magnetLink)
  }, [])

  const pauseDownload = useCallback(async (downloadId: string) => {
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.pause(downloadId)
  }, [])

  const resumeDownload = useCallback(async (downloadId: string) => {
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.resume(downloadId)
  }, [])

  const removeDownload = useCallback(async (downloadId: string) => {
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.remove(downloadId)
  }, [])

  const restartDownload = useCallback(async (downloadId: string) => {
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.restart(downloadId)
  }, [])

  return {
    downloads,
    loading,
    addDownload,
    pauseDownload,
    resumeDownload,
    removeDownload,
    restartDownload,
  }
}

// Hook for accessing a single download
export function useDownload(downloadId: string) {
  const [download, setDownload] = useState<DownloadModel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!downloadId) {
      setLoading(false)
      return () => {}
    }

    setLoading(true)
    const downloadManager = DownloadManager.getInstance()

    // Set up listener for this specific download
    const unsubscribe = downloadManager.getDownloadListener(downloadId, (newDownload) => {
      setDownload(newDownload)
      setLoading(false)
    })

    // Clean up listener on unmount or if downloadId changes
    return () => {
      unsubscribe()
    }
  }, [downloadId]) // Only re-run if downloadId changes

  // Methods to interact with this specific download
  const pauseDownload = useCallback(async () => {
    if (!downloadId) return
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.pause(downloadId)
  }, [downloadId])

  const resumeDownload = useCallback(async () => {
    if (!downloadId) return
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.resume(downloadId)
  }, [downloadId])

  const removeDownload = useCallback(async () => {
    if (!downloadId) return
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.remove(downloadId)
  }, [downloadId])

  const restartDownload = useCallback(async () => {
    if (!downloadId) return
    const downloadManager = DownloadManager.getInstance()
    await downloadManager.restart(downloadId)
  }, [downloadId])

  return {
    download,
    loading,
    pauseDownload,
    resumeDownload,
    removeDownload,
    restartDownload,
  }
}

