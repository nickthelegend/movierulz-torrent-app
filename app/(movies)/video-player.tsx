"use client"

import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"
import * as ScreenOrientation from "expo-screen-orientation"
import Slider from "@react-native-community/slider"
import * as NavigationBar from "expo-navigation-bar"
import TorrentStreamer from "react-native-torrent-streamer"

import { ThemedText } from "@/components/ThemedText"

// Sample movie data - in a real app, this would come from an API
const MOVIES = [
  {
    id: "1",
    title: "Inception",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    // Using a direct video URL for demo purposes since WebTorrent requires more setup
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    id: "2",
    title: "The Dark Knight",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    id: "3",
    title: "Interstellar",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: "4",
    title: "Pulp Fiction",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    id: "5",
    title: "The Matrix",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "6",
    title: "Parasite",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
    directUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
]

const { width, height } = Dimensions.get("window")

// Playback rates
const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const movie = MOVIES.find((m) => m.id === id)

  // Add a help tooltip to show the user how to use the player
  // Add this state at the top with other state variables
  const [showHelp, setShowHelp] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isTorrentMode, setIsTorrentMode] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVolumeControl, setShowVolumeControl] = useState(false)
  const [showPlaybackRateControl, setShowPlaybackRateControl] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [buffering, setBuffering] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const [orientationLock, setOrientationLock] = useState(ScreenOrientation.OrientationLock.PORTRAIT_UP)
  const [showAlert, setShowAlert] = useState(false)
  const [internalError, setInternalError] = useState(null)
  const [torrentUrl, setTorrentUrl] = useState("")
  const [isErrorAlertVisible, setIsErrorAlertVisible] = useState(false)

  const videoRef = useRef(null)
  const webViewRef = useRef(null)
  const seekBarWidth = useRef(0)

  const controlsOpacity = useSharedValue(1)

  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    }
  })

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

  // Hide controls after a delay
  useEffect(() => {
    let timer

    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const hideControls = () => {
      controlsOpacity.value = withTiming(0, { duration: 500 })
      setControlsVisible(false)
    }

    if (controlsVisible && isPlaying && !showVolumeControl && !showPlaybackRateControl && !isSeeking) {
      resetTimer()
      timer = setTimeout(hideControls, 3000)
    } else {
      resetTimer()
    }

    return () => {
      resetTimer()
    }
  }, [controlsVisible, isPlaying, showVolumeControl, showPlaybackRateControl, isSeeking])

  // Toggle controls visibility
  const toggleControls = () => {
    if (showVolumeControl) {
      setShowVolumeControl(false)
      return
    }

    if (showPlaybackRateControl) {
      setShowPlaybackRateControl(false)
      return
    }

    if (controlsVisible) {
      controlsOpacity.value = withTiming(0, { duration: 500 })
      setControlsVisible(false)
    } else {
      controlsOpacity.value = withTiming(1, { duration: 300 })
      setControlsVisible(true)
    }
  }

  // Add a double-tap gesture handler for fullscreen toggle
  // Update the handleDoubleTap function
  const handleDoubleTap = (event) => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const { locationX } = event.nativeEvent
      const screenWidth = Dimensions.get("window").width

      if (locationX < screenWidth / 3) {
        // Double tap on left side - rewind
        skipBackward()
      } else if (locationX > (screenWidth * 2) / 3) {
        // Double tap on right side - forward
        skipForward()
      } else {
        // Double tap in the middle - toggle fullscreen
        toggleFullscreen()
      }
    }

    setLastTap(now)
  }

  // Function to start torrent streaming
  const startTorrentStreaming = async () => {
    if (!movie || !movie.torrentUrl) return

    try {
      setLoading(true)

      // Initialize the torrent streamer if needed
      if (!TorrentStreamer.isStarted) {
        await TorrentStreamer.start()
      }

      // Add the torrent and get the video URL
      const result = await TorrentStreamer.addTorrent(movie.torrentUrl)

      // Find the video file in the torrent
      const videoFiles = result.files.filter(
        (file) => file.name.endsWith(".mp4") || file.name.endsWith(".mkv") || file.name.endsWith(".webm"),
      )

      if (videoFiles.length > 0) {
        // Get the URL of the first video file
        const videoUrl = await TorrentStreamer.getFileUrl(result.torrentId, videoFiles[0].index)
        setTorrentUrl(videoUrl)
        setLoading(false)
      } else {
        throw new Error("No video files found in torrent")
      }
    } catch (err) {
      setError(`Torrent streaming error: ${err.message}`)
      setLoading(false)
    }
  }

  // Replace the useWebTorrent toggle with this
  const toggleStreamingMode = async () => {
    if (!isTorrentMode) {
      // Switching to torrent mode
      setIsTorrentMode(true)
      startTorrentStreaming()
    } else {
      // Switching to direct URL mode
      setIsTorrentMode(false)
      setTorrentUrl("")
      // If video was playing in torrent mode, we need to reset
      if (videoRef.current) {
        await videoRef.current.unloadAsync()
        await videoRef.current.loadAsync({ uri: movie.directUrl }, {}, false)
      }
    }
  }

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isSeeking) {
        setPosition(status.positionMillis)
        setDuration(status.durationMillis)
        setIsPlaying(status.isPlaying)
      }

      // Update buffering state
      if (status.isBuffering !== buffering) {
        setBuffering(status.isBuffering)
      }

      // Handle playback completion
      if (status.didJustFinish) {
        setIsPlaying(false)
        setPosition(0)
        if (videoRef.current) {
          videoRef.current.setPositionAsync(0)
        }
      }
    }
  }

  // Handle seeking
  const handleSeek = (value) => {
    setPosition(value)
  }

  const handleSeekComplete = (value) => {
    if (videoRef.current) {
      videoRef.current.setPositionAsync(value).then(() => {
        setIsSeeking(false)
      })
    }
  }

  // Handle video load
  const handleVideoLoad = (status) => {
    setLoading(false)
    if (videoRef.current) {
      videoRef.current.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate)
      videoRef.current.playAsync()
      setIsPlaying(true)

      // Set initial volume
      videoRef.current.setVolumeAsync(volume)

      // Set initial playback rate
      videoRef.current.setRateAsync(playbackRate, true)

      // Set duration if available
      if (status.durationMillis) {
        setDuration(status.durationMillis)
      }
    }
  }

  // Handle back button
  const handleBack = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync()
    }
    router.back()
  }

  // Show error alert
  const showErrorAlert = () => {
    Alert.alert("Playback Error", `There was an error playing this video: ${error}`, [
      { text: "OK", onPress: () => router.back() },
    ])
  }

  // useEffect(() => {
  //   if (error) {
  //     showErrorAlert()
  //   }
  // }, [error])

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

  const skipForward = async () => {
    if (videoRef.current) {
      const newPosition = Math.min(position + 10000, duration)
      await videoRef.current.setPositionAsync(newPosition)
      setPosition(newPosition)

      // Show skip indicator
      setControlsVisible(true)
      controlsOpacity.value = withTiming(1, { duration: 300 })
    }
  }

  const skipBackward = async () => {
    if (videoRef.current) {
      const newPosition = Math.max(position - 10000, 0)
      await videoRef.current.setPositionAsync(newPosition)
      setPosition(newPosition)

      // Show skip indicator
      setControlsVisible(true)
      controlsOpacity.value = withTiming(1, { duration: 300 })
    }
  }

  // Replace the toggleOrientation function with this improved version
  const toggleOrientation = async () => {
    try {
      let newOrientationLock
      if (isLandscape) {
        newOrientationLock = ScreenOrientation.OrientationLock.PORTRAIT_UP
      } else {
        newOrientationLock = ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
      }
      await ScreenOrientation.lockAsync(newOrientationLock)
      setOrientationLock(newOrientationLock)
      setIsLandscape(!isLandscape)
      // Show a visual indicator that orientation changed
      setControlsVisible(true)
      controlsOpacity.value = withTiming(1, { duration: 300 })
    } catch (error) {
      console.error("Failed to change orientation:", error)
      setInternalError(error)
    }
  }

  // Replace the toggleFullscreen function with this improved version
  const toggleFullscreen = async () => {
    try {
      setIsFullscreen(!isFullscreen)
      // Always toggle orientation when toggling fullscreen
      await toggleOrientation()
      // Show a visual indicator that fullscreen changed
      setControlsVisible(true)
      controlsOpacity.value = withTiming(1, { duration: 300 })
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error)
      setInternalError(error)
    }
  }

  // Add this useEffect to handle orientation changes
  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const isLandscapeOrientation =
        orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT

      setIsLandscape(isLandscapeOrientation)
      setIsFullscreen(isLandscapeOrientation)
    })

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription)
      // Reset to portrait when unmounting
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [])

  const formatTime = (millis) => {
    if (!millis) return "00:00"
    const totalSeconds = Math.floor(millis / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync()
      } else {
        await videoRef.current.playAsync()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = async () => {
    if (videoRef.current) {
      if (isMuted) {
        await videoRef.current.setIsMutedAsync(false)
        await videoRef.current.setVolumeAsync(volume)
      } else {
        await videoRef.current.setIsMutedAsync(true)
      }
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = async (value) => {
    setVolume(value)
    if (videoRef.current && !isMuted) {
      await videoRef.current.setVolumeAsync(value)
    }
  }

  const setPlaybackRateValue = async (rate) => {
    if (videoRef.current) {
      await videoRef.current.setRateAsync(rate, true)
      setPlaybackRate(rate)
      setShowPlaybackRateControl(false)
    }
  }

  useEffect(() => {
    setShowAlert(!!error)
  }, [error])

  useEffect(() => {
    if (showAlert) {
      showErrorAlert()
      setShowAlert(false)
    }
  }, [showAlert])

  useEffect(() => {
    setIsErrorAlertVisible(!!internalError)
  }, [internalError])

  useEffect(() => {
    if (isErrorAlertVisible) {
      Alert.alert("Error", `An error occurred: ${internalError?.message || "Unknown error"}`, [
        {
          text: "OK",
          onPress: () => {
            setIsErrorAlertVisible(false)
            setInternalError(null)
          },
        },
      ])
    }
  }, [isErrorAlertVisible, internalError])

  useEffect(() => {
    return () => {
      // Stop torrent streaming when component unmounts
      if (TorrentStreamer.isStarted) {
        TorrentStreamer.stop()
      }
    }
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video Player */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.videoContainer}
        onPress={toggleControls}
        onLongPress={() => togglePlayPause()}
        delayLongPress={500}
        onPressIn={(e) => handleDoubleTap(e)}
      >
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: isTorrentMode && torrentUrl ? torrentUrl : movie.directUrl }}
          resizeMode={isFullscreen ? ResizeMode.COVER : ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onLoad={handleVideoLoad}
          onError={(error) => {
            setError(`Failed to load video: ${error}`)
            setLoading(false)
          }}
          useNativeControls={false}
          progressUpdateIntervalMillis={500}
        />
        {/* Help Tooltip */}
        {showHelp && (
          <View style={styles.helpContainer}>
            <BlurView intensity={30} tint="dark" style={styles.helpBlur}>
              <View style={styles.helpContent}>
                <ThemedText style={styles.helpTitle}>Video Player Controls</ThemedText>
                <View style={styles.helpItem}>
                  <Ionicons name="play" size={18} color="white" style={styles.helpIcon} />
                  <ThemedText style={styles.helpText}>Tap screen to show/hide controls</ThemedText>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="resize" size={18} color="white" style={styles.helpIcon} />
                  <ThemedText style={styles.helpText}>Double-tap center to toggle fullscreen</ThemedText>
                </View>
                <View style={styles.helpItem}>
                  <Ionicons name="time" size={18} color="white" style={styles.helpIcon} />
                  <ThemedText style={styles.helpText}>Double-tap sides to skip forward/backward</ThemedText>
                </View>
                <TouchableOpacity style={styles.helpCloseButton} onPress={() => setShowHelp(false)}>
                  <ThemedText style={styles.helpCloseText}>Got it</ThemedText>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        )}

        {/* Floating Orientation Button */}
        {!controlsVisible && (
          <TouchableOpacity style={styles.floatingOrientationButton} onPress={toggleOrientation}>
            <BlurView intensity={30} tint="dark" style={styles.floatingButtonBlur}>
              <Ionicons name={isLandscape ? "phone-portrait" : "phone-landscape"} size={24} color="white" />
            </BlurView>
          </TouchableOpacity>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]} style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color="#6a11cb" />
            <ThemedText style={styles.loadingText}>
              {isTorrentMode ? `Loading torrent...` : "Loading video..."}
            </ThemedText>
          </View>
        )}

        {/* Buffering Indicator */}
        {buffering && !loading && (
          <View style={styles.bufferingContainer}>
            <BlurView intensity={20} tint="dark" style={styles.bufferingBlur}>
              <ActivityIndicator size="small" color="#6a11cb" />
              <ThemedText style={styles.bufferingText}>Buffering...</ThemedText>
            </BlurView>
          </View>
        )}

        {/* Video Controls */}
        {controlsVisible && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(500)}
            style={[styles.controlsContainer, controlsAnimatedStyle]}
          >
            <LinearGradient colors={["rgba(0,0,0,0.7)", "transparent"]} style={styles.topGradient}>
              <View style={styles.topControls}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <BlurView intensity={20} tint="dark" style={styles.backButtonBlur}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>

                <ThemedText style={styles.videoTitle}>{movie.title}</ThemedText>

                <TouchableOpacity style={styles.optionButton} onPress={toggleStreamingMode}>
                  <BlurView intensity={20} tint="dark" style={styles.optionButtonBlur}>
                    <Ionicons name={isTorrentMode ? "cloud-download" : "magnet"} size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.bottomGradient}>
              <View style={styles.centerControls}>
                <TouchableOpacity style={styles.controlButton} onPress={skipBackward}>
                  <BlurView intensity={30} tint="dark" style={styles.controlButtonBlur}>
                    <Ionicons name="play-back" size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                  <BlurView intensity={30} tint="dark" style={styles.playPauseButtonBlur}>
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={40}
                      color="white"
                      style={isPlaying ? {} : { marginLeft: 4 }}
                    />
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={skipForward}>
                  <BlurView intensity={30} tint="dark" style={styles.controlButtonBlur}>
                    <Ionicons name="play-forward" size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>
              </View>

              {/* Bottom row controls */}
              <View style={styles.bottomControls}>
                {/* Progress bar with slider */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.timeDisplay}>
                    <ThemedText style={styles.timeText}>{formatTime(position)}</ThemedText>
                  </View>

                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration > 0 ? duration : 1}
                    value={position}
                    onValueChange={(value) => {
                      setIsSeeking(true)
                      handleSeek(value)
                    }}
                    onSlidingStart={() => {
                      setIsSeeking(true)
                    }}
                    onSlidingComplete={(value) => {
                      handleSeekComplete(value)
                    }}
                    minimumTrackTintColor="#6a11cb"
                    maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                    thumbTintColor="#6a11cb"
                    thumbStyle={styles.sliderThumb}
                    trackStyle={styles.sliderTrack}
                  />

                  <View style={styles.timeDisplay}>
                    <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
                  </View>
                </View>

                {/* Bottom row controls */}
                <View style={styles.controlsRow}>
                  <View style={styles.leftControls}>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleMute}>
                      <Ionicons
                        name={isMuted ? "volume-mute" : volume > 0.5 ? "volume-high" : "volume-low"}
                        size={22}
                        color="white"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setShowVolumeControl(!showVolumeControl)}
                    >
                      <ThemedText style={styles.smallButtonText}>Volume</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setShowPlaybackRateControl(!showPlaybackRateControl)}
                    >
                      <ThemedText style={styles.smallButtonText}>{playbackRate}x</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rightControls}>
                    {/* Orientation Button - More prominent */}
                    <TouchableOpacity style={[styles.iconButton, styles.prominentButton]} onPress={toggleOrientation}>
                      <Ionicons
                        name={isLandscape ? "phone-portrait" : "phone-landscape"}
                        size={24}
                        color={isLandscape ? "#6a11cb" : "white"}
                      />
                      <ThemedText style={[styles.buttonLabel, isLandscape && styles.activeButtonLabel]}>
                        {isLandscape ? "Portrait" : "Landscape"}
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Fullscreen Button - More prominent */}
                    <TouchableOpacity style={[styles.iconButton, styles.prominentButton]} onPress={toggleFullscreen}>
                      <Ionicons
                        name={isFullscreen ? "contract" : "expand"}
                        size={24}
                        color={isFullscreen ? "#6a11cb" : "white"}
                      />
                      <ThemedText style={[styles.buttonLabel, isFullscreen && styles.activeButtonLabel]}>
                        {isFullscreen ? "Exit Full" : "Fullscreen"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Volume Control Popup */}
            {showVolumeControl && (
              <View style={styles.volumeControlContainer}>
                <BlurView intensity={30} tint="dark" style={styles.volumeControlBlur}>
                  <Ionicons
                    name={volume > 0.5 ? "volume-high" : "volume-low"}
                    size={24}
                    color="white"
                    style={styles.volumeIcon}
                  />
                  <Slider
                    style={styles.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    value={volume}
                    onValueChange={handleVolumeChange}
                    minimumTrackTintColor="#6a11cb"
                    maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                    thumbTintColor="#6a11cb"
                    thumbStyle={styles.volumeSliderThumb}
                  />
                  <ThemedText style={styles.volumeText}>{Math.round(volume * 100)}%</ThemedText>
                </BlurView>
              </View>
            )}

            {/* Playback Rate Control Popup */}
            {showPlaybackRateControl && (
              <View style={styles.playbackRateContainer}>
                <BlurView intensity={30} tint="dark" style={styles.playbackRateBlur}>
                  <ThemedText style={styles.playbackRateTitle}>Playback Speed</ThemedText>
                  <View style={styles.playbackRateOptions}>
                    {PLAYBACK_RATES.map((rate) => (
                      <TouchableOpacity
                        key={rate}
                        style={[styles.playbackRateOption, playbackRate === rate && styles.playbackRateOptionActive]}
                        onPress={() => setPlaybackRateValue(rate)}
                      >
                        <ThemedText
                          style={[styles.playbackRateText, playbackRate === rate && styles.playbackRateTextActive]}
                        >
                          {rate}x
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              </View>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
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
  webView: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
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
  bufferingContainer: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  bufferingBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  bufferingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#fff",
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topGradient: {
    height: 100,
    width: "100%",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    zIndex: 10,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  videoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 15,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  optionButton: {
    zIndex: 10,
  },
  optionButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomGradient: {
    height: 200,
    width: "100%",
    justifyContent: "space-between",
    paddingBottom: 30,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  playPauseButton: {
    zIndex: 10,
  },
  playPauseButtonBlur: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(106, 17, 203, 0.3)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  controlButton: {
    zIndex: 10,
    marginHorizontal: 15,
  },
  controlButtonBlur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderThumb: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#6a11cb",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  timeDisplay: {
    width: 50,
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 25,
    padding: 8,
    marginHorizontal: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 5,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  smallButtonText: {
    fontSize: 12,
    color: "#fff",
  },
  volumeControlContainer: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
  },
  volumeControlBlur: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  volumeIcon: {
    marginRight: 10,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumeSliderThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6a11cb",
    borderWidth: 1,
    borderColor: "#fff",
  },
  volumeText: {
    width: 40,
    textAlign: "right",
    fontSize: 14,
    color: "#fff",
  },
  playbackRateContainer: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
  },
  playbackRateBlur: {
    padding: 15,
    borderRadius: 15,
    overflow: "hidden",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  playbackRateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  playbackRateOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  playbackRateOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    margin: 5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  playbackRateOptionActive: {
    backgroundColor: "#6a11cb",
  },
  playbackRateText: {
    fontSize: 14,
    color: "#fff",
  },
  playbackRateTextActive: {
    fontWeight: "bold",
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  prominentButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    flexDirection: "column",
    height: "auto",
  },
  buttonLabel: {
    fontSize: 10,
    color: "#fff",
    marginTop: 4,
  },
  activeButtonLabel: {
    color: "#6a11cb",
  },
  floatingOrientationButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 5,
  },
  floatingButtonBlur: {
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
  // Add these styles
  helpContainer: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  helpBlur: {
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  helpContent: {
    padding: 15,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  helpIcon: {
    marginRight: 10,
  },
  helpText: {
    fontSize: 14,
    color: "#fff",
  },
  helpCloseButton: {
    backgroundColor: "#6a11cb",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  helpCloseText: {
    color: "#fff",
    fontWeight: "bold",
  },
})

