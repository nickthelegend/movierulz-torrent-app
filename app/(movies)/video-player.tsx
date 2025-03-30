"use client"
import { useState, useEffect } from "react"
import { StyleSheet, View, TouchableOpacity, StatusBar, Dimensions, Platform, BackHandler } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as ScreenOrientation from "expo-screen-orientation"
import { useVideoPlayer, VideoView } from "expo-video"
import { useEvent } from "expo"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as NavigationBar from "expo-navigation-bar"

import { ThemedText } from "@/components/ThemedText"
import type { DownloadModel } from "@/utils/downloadManager"

export default function VideoPlayerScreen() {
  const { id, filePath } = useLocalSearchParams()
  const router = useRouter()
  const [isPortrait, setIsPortrait] = useState(isPortrait)
  const [isLoading, setIsLoading] = useState(true)
  const [videoPath, setVideoPath] = useState("")
  const [error, setError] = useState("")
  const [controlsVisible, setControlsVisible] = useState(true)

  useEffect(() => {
    // Set initial orientation to landscape
    lockOrientation(false)

    // Hide system navigation bar
    hideSystemUI()

    // If filePath is provided, use it directly
    if (filePath) {
      console.log("Using provided file path:", filePath)
      setVideoPath(decodeURIComponent(filePath as string))
      setIsLoading(false)
      return
    }

    // Otherwise get the video file path from the downloaded torrent
    getVideoFilePath()

    // Handle back button press
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack()
      return true
    })

    // Clean up on unmount
    return () => {
      backHandler.remove()

      // Reset to portrait orientation when leaving the screen
      resetOrientation()
    }
  }, [])

  const resetOrientation = async () => {
    try {
      // First show the system UI
      await showSystemUI()

      // Then set orientation to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)

      // Add a small delay to ensure the orientation change completes
      setTimeout(() => {
        console.log("Orientation reset to portrait")
      }, 100)
    } catch (error) {
      console.error("Error resetting orientation:", error)
    }
  }

  const hideSystemUI = async () => {
    // Hide status bar
    StatusBar.setHidden(true, "fade")

    // Hide navigation bar on Android
    if (Platform.OS === "android") {
      try {
        await NavigationBar.setVisibilityAsync("hidden")
        await NavigationBar.setBehaviorAsync("inset-swipe")
      } catch (e) {
        console.error("Error hiding navigation bar:", e)
      }
    }
  }

  const showSystemUI = async () => {
    // Show status bar
    StatusBar.setHidden(false, "fade")

    // Show navigation bar on Android
    if (Platform.OS === "android") {
      try {
        await NavigationBar.setVisibilityAsync("visible")
      } catch (e) {
        console.error("Error showing navigation bar:", e)
      }
    }
  }

  // Initialize the video player once we have the video path
  const player = useVideoPlayer(videoPath || null, (player) => {
    if (player && videoPath) {
      player.loop = true
      player.play()
    }
  })

  // Listen for playing state changes
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player?.playing || false })

  const getVideoFilePath = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Get all downloads from AsyncStorage
      const jsonValue = await AsyncStorage.getItem("downloads")
      const downloads: DownloadModel[] = jsonValue != null ? JSON.parse(jsonValue) : []

      console.log("All downloads:", downloads)

      // Find the download for this movie
      const movieDownload = downloads.find((download) => {
        // Check if the download ID contains the movie ID
        if (download._id.includes(`_${id}`)) return true

        // Or if the source contains the movie ID
        if (download.source && download.source.includes(`id=${id}`)) return true

        return false
      })

      console.log("Found movie download:", movieDownload)

      if (!movieDownload) {
        setError("Download not found. Please download the movie first.")
        setIsLoading(false)
        return
      }

      if (movieDownload.status !== "COMPLETED") {
        setError("Download not complete. Please wait for the download to finish.")
        setIsLoading(false)
        return
      }

      if (!movieDownload.location) {
        setError("Video file location not found.")
        setIsLoading(false)
        return
      }

      // In a real app, you would scan the directory to find the video file
      // For this example, we'll use the location directly
      // The location should be the full path to the video file
      const videoFilePath = `file://${movieDownload.location}`

      console.log("Video file path:", videoFilePath)
      setVideoPath(videoFilePath)
      setIsLoading(false)
    } catch (error) {
      console.error("Error getting video file path:", error)
      setError(`Error loading video: ${error.message}`)
      setIsLoading(false)
    }
  }

  const lockOrientation = async (portrait) => {
    try {
      if (portrait) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      }
      setIsPortrait(portrait)
    } catch (error) {
      console.error("Error changing orientation:", error)
    }
  }

  const toggleOrientation = async () => {
    await lockOrientation(!isPortrait)
  }

  const handleBack = async () => {
    // First reset orientation to portrait
    await resetOrientation()

    // Then navigate back
    setTimeout(() => {
      router.back()
    }, 100)
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause()
    } else {
      player.play()
    }
  }

  const toggleControls = () => {
    setControlsVisible(!controlsVisible)
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity activeOpacity={1} style={styles.videoContainer} onPress={toggleControls}>
            <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
          </TouchableOpacity>

          {controlsVisible && (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={toggleOrientation}>
                <Ionicons name={isPortrait ? "phone-landscape" : "phone-portrait"} size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const { width, height } = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controls: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "white",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#6a11cb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})

