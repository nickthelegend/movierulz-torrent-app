"use client"

import { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  View,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/ThemedText"

// Movie interface
interface Movie {
  id: string
  title: string
  year: string
  poster: string
  quality: string
  language: string
  url: string
}

export default function HomeScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [movies, setMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const scale = useSharedValue(1)
  const [dimensions, setDimensions] = useState(Dimensions.get("window"))
  const [isLandscape, setIsLandscape] = useState(dimensions.width > dimensions.height)
  const flatListRef = useRef(null)

  // Calculate grid dimensions based on orientation
  const numColumns = isLandscape ? 4 : 2
  const itemWidth = (dimensions.width - (numColumns + 1) * 10) / numColumns
  const itemHeight = itemWidth * 1.5

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window)
      setIsLandscape(window.width > window.height)
    })

    return () => subscription.remove()
  }, [])

  // Parse HTML to extract movie data
  const parseMovieHTML = (html: string) => {
    try {
      const movies: Movie[] = []

      // Find all movie sections (featured, latest, etc.)
      const allSections = html.match(/<ul>([\s\S]*?)<\/ul>/g)

      if (!allSections || allSections.length === 0) {
        console.log("No movie sections found")
        return movies
      }

      // Process each section
      allSections.forEach((section) => {
        // Extract movie blocks
        const movieBlocks = section.match(/<li>\s*<div class="boxed film">([\s\S]*?)<\/div>\s*<\/li>/g)

        if (!movieBlocks || movieBlocks.length === 0) {
          return
        }

        // Process each movie block
        movieBlocks.forEach((block, index) => {
          try {
            // Extract URL
            const urlMatch = block.match(/href="([^"]+)"/i)
            const url = urlMatch ? urlMatch[1] : ""

            // Extract ID from URL
            const idMatch = url.match(/\/([^/]+)\/movie-watch-online-free-(\d+)\.html/)
            const id = idMatch ? idMatch[2] : `movie_${Math.random().toString(36).substring(2, 9)}`

            // Extract poster URL
            const posterMatch = block.match(/src="([^"]+)"/i)
            const poster = posterMatch ? posterMatch[1] : ""

            // Extract title and metadata
            const titleMatch = block.match(/<p><b>([^<]+)<\/b><\/p>/i)
            const fullTitle = titleMatch ? titleMatch[1].trim() : `Unknown Movie ${index + 1}`

            // Extract year from title
            const yearMatch = fullTitle.match(/$$(\d{4})$$/)
            const year = yearMatch ? yearMatch[1] : ""

            // Extract quality from title
            const qualityMatch = fullTitle.match(/$$.*?$$\s*(PREHD|HDRip|DVDScr|BRRip)/i)
            const quality = qualityMatch ? qualityMatch[1] : "HD"

            // Extract language from title
            const languageMatch = fullTitle.match(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/i)
            const language = languageMatch ? languageMatch[1] : ""

            // Clean up title
            const title = fullTitle
              .replace(/$$\d{4}$$/g, "")
              .replace(/\s*(PREHD|HDRip|DVDScr|BRRip)\s*/gi, "")
              .replace(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/gi, "")
              .replace(/Movie Watch Online Free/gi, "")
              .trim()

            // Add movie to array if it has a poster and title
            if (poster && title) {
              movies.push({
                id,
                title,
                year,
                poster,
                quality,
                language,
                url,
              })
            }
          } catch (err) {
            console.error(`Error parsing movie block:`, err)
          }
        })
      })

      return movies
    } catch (err) {
      console.error("Error extracting movies from HTML:", err)
      return []
    }
  }

  // Check if there are more pages
  const checkForMorePages = (html: string): boolean => {
    // Look for pagination links
    const paginationMatch = html.match(/<div class="nav-newer"><a href="[^"]+">older -&gt;<\/a><\/div>/i)
    return !!paginationMatch
  }

  // Fetch movies from the website
  const fetchMovies = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      // Construct the URL for the requested page
      const url =
        page === 1 ? "https://www.5movierulz.prof/movies/" : `https://www.5movierulz.prof/movies/page/${page}/`

      console.log(`Fetching movies from: ${url}`)

      // Use a CORS proxy for development (in production, this should be handled by your backend)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`

      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()

      // Parse the HTML to extract movie data
      const movieData = parseMovieHTML(html)
      const hasMore = checkForMorePages(html)

      console.log(`Extracted ${movieData.length} movies from page ${page}`)
      console.log(`Has more pages: ${hasMore}`)

      if (append) {
        setMovies((prevMovies) => {
          // Filter out duplicates by ID
          const newMovies = movieData.filter(
            (newMovie) => !prevMovies.some((existingMovie) => existingMovie.id === newMovie.id),
          )
          return [...prevMovies, ...newMovies]
        })
      } else {
        setMovies(movieData)
      }

      setHasMorePages(hasMore)
      setCurrentPage(page)
    } catch (err) {
      console.error("Error fetching movies:", err)
      setError(`Failed to load movies: ${err.message}`)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchMovies(1, false)
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchMovies(1, false)
  }

  const loadMoreMovies = () => {
    if (hasMorePages && !loadingMore) {
      fetchMovies(currentPage + 1, true)
    }
  }

  const goToNextPage = () => {
    if (hasMorePages && !loadingMore) {
      const nextPage = currentPage + 1
      console.log(`Navigating to page ${nextPage}`)
      fetchMovies(nextPage, false)

      // Scroll to top
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true })
      }
    }
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const handlePressIn = () => {
    scale.value = withSpring(0.95)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1)
  }

  const handleMoviePress = (movieId) => {
    console.log(`Navigating to movie: ${movieId}`)
    // Use the correct path format for the movies route
    router.push(`/(movies)/${movieId}`)
  }

  const renderMovie = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay((index % 8) * 100).springify()}
      style={[styles.movieContainer, { width: itemWidth }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => handleMoviePress(item.id)}
        style={[styles.movieTouchable, { width: itemWidth, height: itemHeight }]}
      >
        <Animated.View style={[styles.movieCard, animatedStyle]}>
          <Image
            source={{ uri: item.poster }}
            style={styles.poster}
            defaultSource={require("@/assets/images/icon.png")}
          />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)", "#000"]} style={styles.gradientOverlay} />
          <View style={styles.movieInfo}>
            <ThemedText type="title" style={styles.title} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <View style={styles.detailsRow}>
              <ThemedText style={styles.year}>{item.year}</ThemedText>
              <View style={styles.qualityContainer}>
                <ThemedText style={styles.quality}>{item.quality}</ThemedText>
              </View>
            </View>
            <View style={styles.languageContainer}>
              <ThemedText style={styles.language}>{item.language}</ThemedText>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )

  const renderFooter = () => {
    if (!loadingMore) return null

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6a11cb" />
        <ThemedText style={styles.loadingMoreText}>Loading more movies...</ThemedText>
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6a11cb" />
        <ThemedText style={styles.loadingText}>Loading Movies...</ThemedText>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />

      <Animated.View entering={FadeInRight.springify()} style={styles.header}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={["rgba(106, 17, 203, 0.5)", "rgba(37, 117, 252, 0.5)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View>
                <ThemedText type="title" style={styles.headerTitle}>
                  MovieRulz
                </ThemedText>
                <ThemedText style={styles.headerSubtitle}>Watch & Download Movies</ThemedText>
              </View>

              {/* Next Page Button */}
              <TouchableOpacity
                style={styles.nextPageButton}
                onPress={goToNextPage}
                disabled={!hasMorePages || loadingMore}
              >
                <LinearGradient
                  colors={["#6a11cb", "#2575fc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextPageButtonGradient}
                >
                  <ThemedText style={styles.nextPageText}>Next Page</ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="white" style={styles.nextPageIcon} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#6a11cb" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMovies(1, false)}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButtonGradient}
            >
              <Ionicons name="refresh" size={18} color="white" style={styles.retryIcon} />
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          key={`grid-${numColumns}`} // Force re-render when columns change
          data={movies}
          renderItem={renderMovie}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6a11cb"]} tintColor="#6a11cb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={64} color="#6a11cb" />
              <ThemedText style={styles.emptyText}>No movies found</ThemedText>
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={loadMoreMovies}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Page Indicator */}
      {movies.length > 0 && (
        <View style={styles.pageIndicator}>
          <BlurView intensity={30} tint="dark" style={styles.pageIndicatorBlur}>
            <ThemedText style={styles.pageIndicatorText}>Page {currentPage}</ThemedText>
          </BlurView>
        </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  nextPageButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  nextPageButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  nextPageIcon: {
    marginLeft: 5,
  },
  nextPageText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  movieContainer: {
    marginBottom: 20,
  },
  movieTouchable: {
    borderRadius: 15,
    overflow: "hidden",
  },
  movieCard: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  poster: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    borderRadius: 15,
  },
  movieInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  year: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  qualityContainer: {
    backgroundColor: "rgba(106, 17, 203, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quality: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  languageContainer: {
    backgroundColor: "rgba(37, 117, 252, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  language: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
  },
  retryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    height: 300,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMoreText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 10,
  },
  pageIndicator: {
    position: "absolute",
    bottom: 90, // Adjusted to be above the tab bar
    right: 20,
  },
  pageIndicatorBlur: {
    borderRadius: 15,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
})

