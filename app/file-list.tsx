"use client"
import { useState, useEffect } from "react"
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as FileSystem from "expo-file-system"

import { ThemedText } from "@/components/ThemedText"
import type { DownloadModel } from "@/utils/downloadManager"

interface TorrentFile {
  name: string
  path: string
  size: number
  type: string
}

export default function FileListScreen() {
  const { downloadId } = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [download, setDownload] = useState<DownloadModel | null>(null)
  const [files, setFiles] = useState<TorrentFile[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!downloadId) {
      setError("No download ID provided")
      setLoading(false)
      return
    }

    fetchDownloadAndFiles()
  }, [downloadId])

  const fetchDownloadAndFiles = async () => {
    try {
      setLoading(true)
      setError("")

      // Get the download from AsyncStorage
      const jsonValue = await AsyncStorage.getItem("downloads")
      const downloads: DownloadModel[] = jsonValue != null ? JSON.parse(jsonValue) : []
      const foundDownload = downloads.find((d) => d._id === downloadId)

      if (!foundDownload) {
        setError("Download not found")
        setLoading(false)
        return
      }

      setDownload(foundDownload)

      if (foundDownload.location) {
        try {
          // Get the directory path - ensure it has the correct scheme
          let dirPath = foundDownload.location

          // If the path doesn't start with file://, add it
          if (!dirPath.startsWith("file://")) {
            dirPath = `file://${dirPath}`
          }

          console.log("Reading directory:", dirPath)

          // Read the directory contents
          const dirContents = await FileSystem.readDirectoryAsync(dirPath)
          console.log("Directory contents:", dirContents)

          // Process each file
          const filePromises = dirContents.map(async (fileName) => {
            const filePath = `${dirPath}/${fileName}`
            const fileInfo = await FileSystem.getInfoAsync(filePath)

            // Determine file type based on extension
            const extension = fileName.split(".").pop()?.toLowerCase() || ""
            let fileType = "other"

            if (["mp4", "mkv", "avi", "mov", "webm", "m4v"].includes(extension)) {
              fileType = "video"
            } else if (["srt", "vtt", "ass", "ssa"].includes(extension)) {
              fileType = "subtitle"
            } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
              fileType = "image"
            } else if (["txt", "nfo", "md"].includes(extension)) {
              fileType = "text"
            }

            return {
              name: fileName,
              path: filePath,
              size: fileInfo.size || 0,
              type: fileType,
            } as TorrentFile
          })

          const fileList = await Promise.all(filePromises)

          // Sort files: videos first, then subtitles, then others
          fileList.sort((a, b) => {
            const typeOrder = { video: 0, subtitle: 1, image: 2, text: 3, other: 4 }
            return typeOrder[a.type] - typeOrder[b.type] || a.name.localeCompare(b.name)
          })

          setFiles(fileList)

          if (fileList.length === 0) {
            setError("No files found in this download")
          }
        } catch (e) {
          console.error("Error reading directory:", e)
          setError(`Error reading files: ${e.message}`)
        }
      } else {
        setError("No file location found for this download")
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching download and files:", error)
      setError(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "video":
        return "videocam"
      case "subtitle":
        return "text"
      case "image":
        return "image"
      case "text":
        return "document-text"
      default:
        return "document"
    }
  }

  const handleFilePress = (file: TorrentFile) => {
    if (file.type === "video") {
      router.push(`/(movies)/video-player?filePath=${encodeURIComponent(file.path)}`)
    } else if (file.type === "image") {
      // Could implement image viewer here
      Alert.alert("Image", `This is an image file: ${file.name}`)
    } else if (file.type === "text" || file.type === "subtitle") {
      // Could implement text viewer here
      Alert.alert("Text File", `This is a text file: ${file.name}`)
    } else {
      Alert.alert("File Type", `This file type cannot be opened: ${file.name}`)
    }
  }

  const renderFileItem = ({ item, index }: { item: TorrentFile; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.fileItem}>
      <TouchableOpacity
        style={styles.fileItemContent}
        onPress={() => handleFilePress(item)}
        activeOpacity={item.type === "video" ? 0.7 : 0.9}
      >
        <View style={[styles.fileIconContainer, { backgroundColor: getFileTypeColor(item.type) }]}>
          <Ionicons name={getFileIcon(item.type)} size={24} color="white" />
        </View>
        <View style={styles.fileDetails}>
          <ThemedText style={styles.fileName}>{item.name}</ThemedText>
          <ThemedText style={styles.fileSize}>{formatBytes(item.size)}</ThemedText>
        </View>
        {item.type === "video" && (
          <TouchableOpacity style={styles.playButton} onPress={() => handleFilePress(item)}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playButtonGradient}
            >
              <Ionicons name="play" size={16} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  )

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case "video":
        return "#6a11cb"
      case "subtitle":
        return "#2ecc71"
      case "image":
        return "#3498db"
      case "text":
        return "#e67e22"
      default:
        return "#95a5a6"
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <Animated.View entering={FadeInRight.springify()} style={styles.header}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={["rgba(106, 17, 203, 0.5)", "rgba(37, 117, 252, 0.5)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <ThemedText type="title" style={styles.headerTitle}>
                {download?.name ? `Files: ${download.name}` : "File List"}
              </ThemedText>
              <View style={{ width: 24 }} /> {/* Empty view for alignment */}
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6a11cb" />
          <ThemedText style={styles.loadingText}>Loading files...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="rgba(255, 255, 255, 0.3)" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backButtonGradient}
            >
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document" size={64} color="rgba(255, 255, 255, 0.3)" />
          <ThemedText style={styles.emptyText}>No files found</ThemedText>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backButtonGradient}
            >
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    marginBottom: 10,
  },
  blurContainer: {
    overflow: "hidden",
    borderRadius: 20,
    marginHorizontal: 20,
  },
  headerGradient: {
    padding: 20,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 20,
    marginBottom: 30,
  },
  backButtonLarge: {
    borderRadius: 25,
    overflow: "hidden",
    width: 200,
  },
  backButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  fileItem: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
  },
  fileItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  fileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  playButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
})

