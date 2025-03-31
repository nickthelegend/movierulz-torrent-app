"use client"
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated"

import { ThemedText } from "@/components/ThemedText"
import { useDownloads } from "@/utils/useDownloadManager"

export default function DownloadsScreen() {
  const router = useRouter()
  const { downloads, loading, pauseDownload, resumeDownload, removeDownload } = useDownloads()

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const formatSpeed = (bytesPerSecond) => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "DOWNLOADING":
        return "#2575fc"
      case "PAUSED":
        return "#f39c12"
      case "COMPLETED":
        return "#2ecc71"
      case "ERROR":
        return "#e74c3c"
      default:
        return "#95a5a6"
    }
  }

  const handleRemoveDownload = (downloadId) => {
    Alert.alert("Remove Download", "Are you sure you want to remove this download?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        onPress: () => removeDownload(downloadId),
        style: "destructive",
      },
    ])
  }

  const handleShowFiles = (downloadId) => {
    router.push(`/file-list?downloadId=${downloadId}`)
  }

  const renderDownloadItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.downloadItem}>
      <View style={styles.downloadHeader}>
        <ThemedText style={styles.downloadName}>{item.name}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <ThemedText style={styles.statusText}>{item.status}</ThemedText>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
      </View>

      {/* Download Info */}
      <View style={styles.downloadInfoRow}>
        <ThemedText style={styles.downloadInfo}>
          {formatBytes(item.downloadedSize)} / {formatBytes(item.totalSize || 0)}
        </ThemedText>

        {item.status === "DOWNLOADING" && (
          <ThemedText style={styles.speedText}>{formatSpeed(item.downloadRate)}</ThemedText>
        )}
      </View>

      {/* Progress Percentage */}
      <ThemedText style={styles.progressText}>
        {Math.round(item.progress)}% {item.status === "COMPLETED" ? "Complete" : "Downloaded"}
      </ThemedText>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {item.status === "DOWNLOADING" ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => pauseDownload(item._id)}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="pause" size={18} color="white" style={styles.actionIcon} />
              <ThemedText style={styles.actionText}>Pause</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        ) : item.status === "PAUSED" ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => resumeDownload(item._id)}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="play" size={18} color="white" style={styles.actionIcon} />
              <ThemedText style={styles.actionText}>Resume</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* Show Files Button - Available for all downloads with a location */}
        {item.location && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleShowFiles(item._id)}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="folder-open" size={18} color="white" style={styles.actionIcon} />
              <ThemedText style={styles.actionText}>Show Files</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {item.status === "COMPLETED" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Extract movie ID from the download name or metadata
              // Assuming the movie ID is stored in the download source or can be extracted from the ID
              const movieId = item.source.includes("id=")
                ? item.source.split("id=")[1].split("&")[0]
                : item._id.includes("_")
                  ? item._id.split("_")[1]
                  : "1" // Default to first movie if ID can't be extracted

              router.push(`/(movies)/video-player?id=${movieId}`)
            }}
          >
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="play" size={18} color="white" style={styles.actionIcon} />
              <ThemedText style={styles.actionText}>Watch</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveDownload(item._id)}
        >
          <LinearGradient
            colors={["#e74c3c", "#c0392b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="trash" size={18} color="white" style={styles.actionIcon} />
            <ThemedText style={styles.actionText}>Remove</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )

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
              <ThemedText type="title" style={styles.headerTitle}>
                Downloads
              </ThemedText>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6a11cb" />
          <ThemedText style={styles.loadingText}>Loading downloads...</ThemedText>
        </View>
      ) : downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="download" size={64} color="rgba(255, 255, 255, 0.3)" />
          <ThemedText style={styles.emptyText}>No downloads yet</ThemedText>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push("/")}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.browseButtonGradient}
            >
              <ThemedText style={styles.browseButtonText}>Browse Movies</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={downloads}
          renderItem={renderDownloadItem}
          keyExtractor={(item) => item._id}
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
    paddingBottom: 80, // Add padding for the tab bar
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
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
  browseButton: {
    borderRadius: 25,
    overflow: "hidden",
    width: 200,
  },
  browseButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  browseButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  downloadItem: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  downloadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  downloadName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6a11cb",
    borderRadius: 4,
  },
  downloadInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  downloadInfo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  speedText: {
    fontSize: 12,
    color: "#2575fc",
    fontWeight: "bold",
  },
  progressText: {
    fontSize: 14,
    color: "white",
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    borderRadius: 20,
    overflow: "hidden",
    minWidth: 100,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionIcon: {
    marginRight: 5,
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: "#e74c3c",
  },
})

