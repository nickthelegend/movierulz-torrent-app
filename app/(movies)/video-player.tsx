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
import { Video, ResizeMode } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import WebView from "react-native-webview"
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"

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

// WebTorrent client script for WebView
const webTorrentScript = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { margin: 0; padding: 0; background-color: #000; overflow: hidden; }
      #videoContainer { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
      video { width: 100%; height: 100%; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"></script>
  </head>
  <body>
    <div id="videoContainer">
      <video id="video" controls></video>
    </div>
    <script>
      // Initialize WebTorrent client
      const client = new WebTorrent();
      
      // Function to load torrent
      function loadTorrent(torrentId) {
        // Remove any existing torrents
        client.torrents.forEach(torrent => {
          torrent.destroy();
        });
        
        // Add the new torrent
        client.add(torrentId, function (torrent) {
          // Find the video file
          const file = torrent.files.find(function (file) {
            return file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mkv');
          });
          
          if (file) {
            // Stream the file to the video element
            file.renderTo('#video');
            
            // Send loading progress to React Native
            torrent.on('download', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'progress',
                progress: (torrent.progress * 100).toFixed(1)
              }));
            });
            
            // Send ready state when metadata is ready
            torrent.on('ready', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready',
                name: torrent.name
              }));
            });
            
            // Send error if any
            torrent.on('error', function(err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: err.message
              }));
            });
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'No video file found in torrent'
            }));
          }
        });
      }
      
      // Listen for messages from React Native
      window.addEventListener('message', function(event) {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'load') {
            loadTorrent(message.torrentId);
          }
        } catch (e) {
          console.error('Error parsing message', e);
        }
      });
      
      // Notify React Native that the WebView is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'webviewReady'
      }));
    </script>
  </body>
  </html>
`

const { width, height } = Dimensions.get("window")

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const movie = MOVIES.find((m) => m.id === id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [useWebTorrent, setUseWebTorrent] = useState(false)

  const videoRef = useRef(null)
  const webViewRef = useRef(null)

  const controlsOpacity = useSharedValue(1)

  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    }
  })

  // Hide controls after a delay
  useEffect(() => {
    let timer
    if (controlsVisible && isPlaying) {
      timer = setTimeout(() => {
        controlsOpacity.value = withTiming(0, { duration: 500 })
        setControlsVisible(false)
      }, 3000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [controlsVisible, isPlaying])

  // Toggle controls visibility
  const toggleControls = () => {
    if (controlsVisible) {
      controlsOpacity.value = withTiming(0, { duration: 500 })
      setControlsVisible(false)
    } else {
      controlsOpacity.value = withTiming(1, { duration: 300 })
      setControlsVisible(true)
    }
  }

  // Handle WebView messages
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data)

      switch (message.type) {
        case "webviewReady":
          // WebView is ready, load the torrent
          if (movie && movie.torrentUrl) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: "load",
                torrentId: movie.torrentUrl,
              }),
            )
          }
          break
        case "progress":
          setProgress(Number.parseFloat(message.progress))
          break
        case "ready":
          setLoading(false)
          break
        case "error":
          setError(message.message)
          setLoading(false)
          break
      }
    } catch (e) {
      console.error("Error parsing WebView message", e)
    }
  }

  // Handle video load
  const handleVideoLoad = () => {
    setLoading(false)
    if (videoRef.current) {
      videoRef.current.playAsync()
      setIsPlaying(true)
    }
  }

  // Toggle play/pause
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

  // Handle back button
  const handleBack = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync()
    }
    router.back()
  }

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert("Playback Error", `There was an error playing this video: ${error}`, [
        { text: "OK", onPress: () => router.back() },
      ])
    }
  }, [error])

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
      <TouchableOpacity activeOpacity={1} style={styles.videoContainer} onPress={toggleControls}>
        {useWebTorrent ? (
          <WebView
            ref={webViewRef}
            source={{ html: webTorrentScript }}
            style={styles.webView}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onMessage={handleWebViewMessage}
          />
        ) : (
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: movie.directUrl }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={false}
            onLoad={handleVideoLoad}
            onError={(error) => {
              setError(`Failed to load video: ${error}`)
              setLoading(false)
            }}
            useNativeControls={false}
          />
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]} style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color="#6a11cb" />
            <ThemedText style={styles.loadingText}>
              {useWebTorrent ? `Loading torrent... ${progress.toFixed(1)}%` : "Loading video..."}
            </ThemedText>
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

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setUseWebTorrent(!useWebTorrent)
                    setLoading(true)
                  }}
                >
                  <BlurView intensity={20} tint="dark" style={styles.optionButtonBlur}>
                    <Ionicons name={useWebTorrent ? "cloud-download" : "magnet"} size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.bottomGradient}>
              <View style={styles.centerControls}>
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
              </View>

              <View style={styles.bottomControls}>
                {/* Progress bar would go here in a full implementation */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground} />
                  <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
              </View>
            </LinearGradient>
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
    height: 150,
    width: "100%",
    justifyContent: "space-between",
    paddingBottom: 30,
  },
  centerControls: {
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseButton: {
    zIndex: 10,
  },
  playPauseButtonBlur: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBarContainer: {
    height: 5,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6a11cb",
    borderRadius: 2.5,
  },
})

