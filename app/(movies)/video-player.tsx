"use client"

import { useState, useEffect, useRef } from "react"
import { StyleSheet, View, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import * as NavigationBar from "expo-navigation-bar"
import * as ScreenOrientation from "expo-screen-orientation"
import { useEvent } from "expo"
import { useVideoPlayer, VideoView } from "expo-video"

import { ThemedText } from "@/components/ThemedText"

// Sample movie data - in a real app, this would come from an API
const MOVIES = [
  {
    id: "1",
    title: "Inception",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    id: "2",
    title: "The Dark Knight",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    id: "3",
    title: "Interstellar",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: "4",
    title: "Pulp Fiction",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    id: "5",
    title: "The Matrix",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "6",
    title: "Parasite",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
]

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const movie = MOVIES.find((m) => m.id === id)

  // State variables
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLandscape, setIsLandscape] = useState(false)
  const loadingTimeoutRef = useRef(null)

  // Force loading to end after a reasonable time
  useEffect(() => {
    // Force hide loading after 3 seconds regardless of events
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  // Initialize video player with the direct URL
  const videoUrl = movie?.directUrl || ""
  const player = useVideoPlayer(videoUrl, (player) => {
    // Auto-play when ready
    try {
      player.play()
    } catch (err) {
      console.error("Error playing video:", err)
      setError(err)
    }
  })

  // Use events from the player
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing })
  const { isLoaded } = useEvent(player, "loadedChange", { isLoaded: player.loaded })
  const { isBuffering } = useEvent(player, "bufferingChange", { isBuffering: player.buffering })
  const { currentTime } = useEvent(player, "timeUpdate", { currentTime: player.currentTime })

  // Update loading state based on player events
  useEffect(() => {
    if (isLoaded || isPlaying || currentTime > 0) {
      setLoading(false)
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [isLoaded, isPlaying, currentTime])

  // Toggle orientation function
  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        // Change to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        setIsLandscape(false)
      } else {
        // Change to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT)
        setIsLandscape(true)
      }
    } catch (err) {
      console.error("Error changing orientation:", err)
    }
  }

  // Reset orientation when unmounting
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [])

  // Listen for orientation changes
  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const isLandscapeOrientation =
        orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT

      setIsLandscape(isLandscapeOrientation)
    })

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription)
    }
  }, [])

  // Hide navigation bar function
  const hideSystemUI = async () => {
    if (Platform.OS === "android") {
      await NavigationBar.setVisibilityAsync("hidden")
      await NavigationBar.setBehaviorAsync("overlay-swipe")
    }
    StatusBar.setHidden(true, "fade")
  }

  // Show navigation bar function for cleanup
  const showSystemUI = async () => {
    if (Platform.OS === "android") {
      await NavigationBar.setVisibilityAsync("visible")
      await NavigationBar.setBehaviorAsync("default")
    }
    StatusBar.setHidden(false, "fade")
  }

  // Hide system UI when component mounts
  useEffect(() => {
    hideSystemUI()
    return () => {
      showSystemUI()
    }
  }, [])

  // Handle back button
  const handleBack = () => {
    if (player) {
      try {
        player.pause()
      } catch (err) {
        console.error("Error pausing video:", err)
      }
    }
    router.back()
  }

  // If no movie found
  if (!movie) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Movie not found</ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backLink}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView style={styles.video} player={player} resizeMode="contain" allowsFullscreen allowsPictureInPicture />

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]} style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color="#6a11cb" />
            <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorOverlay}>
            <ThemedText style={styles.errorText}>Error loading video: {error.message || "Unknown error"}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
              <ThemedText style={styles.retryText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </View>
        </TouchableOpacity>

        {/* Orientation Toggle Button */}
        <TouchableOpacity style={styles.orientationButton} onPress={toggleOrientation}>
          <View style={[styles.orientationButtonInner, isLandscape && styles.activeButton]}>
            <Ionicons
              name={isLandscape ? "phone-portrait" : "phone-landscape"}
              size={24}
              color={isLandscape ? "#6a11cb" : "white"}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backLink: {
    marginTop: 20,
    color: "#6a11cb",
    fontSize: 16,
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  orientationButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
    zIndex: 10,
  },
  orientationButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  activeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "#6a11cb",
    borderWidth: 2,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#6a11cb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
  },
})

