import { $ } from "bun";

async function fetchYouTubeVideos(searchTerm: string) {
  try {
    // Step 1: Search for the channel and get its channel ID
    const searchResult = await $`yt-dlp -j "ytsearch:${searchTerm}"`.text();
    const searchResults = searchResult
      .split("\n")
      .map((line) => (line ? JSON.parse(line) : null))
      .filter(Boolean);

    if (searchResults.length === 0) {
      throw new Error("No search results found.");
    }

    const exactMatch = searchResults.find((res) => res.channel === searchTerm);
    const channelId = exactMatch ? exactMatch.channel_id : searchResults[0].channel_id;

    if (!channelId) {
      throw new Error("Could not determine channel ID.");
    }

    // Step 2: Retrieve all videos from the channel
    const videoData = await $`yt-dlp --flat-playlist -j "https://www.youtube.com/channel/${channelId}"`.text();
    const videos = videoData
      .split("\n")
      .map((line) => (line ? JSON.parse(line) : null))
      .filter(Boolean)
      .map((video) => ({
        title: video.title,
        duration: video.duration,
        views: video.view_count,
        uploadDate: video.upload_date,
      }));

    return videos;
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
}

// Example usage
fetchYouTubeVideos("Linus Tech Tips").then((videos) => console.log(videos));
