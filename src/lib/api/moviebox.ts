import axios, { AxiosInstance, AxiosError } from 'axios';
import type { HomepageResponse, TrendingResponse, SearchResponse, DetailResponse, SourcesResponse, GenerateStreamResponse, ApiError } from '@/types/api';

class MovieBoxAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Development: hit upstream directly (localhost, any IP)
    // Production: use /api proxy (allows server-side Warp to work)
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.startsWith('192.168.') ||
       window.location.hostname.startsWith('10.'));
    
    this.baseURL = isDevelopment 
      ? 'https://api.sansekai.my.id/api'
      : '/api';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth headers or modifications here
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      },
    );
  }

  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: error.message || 'An unexpected error occurred',
      statusCode: error.response?.status,
      endpoint: error.config?.url,
    };

    if (error.response) {
      // Server responded with error status
      apiError.message = (error.response.data as any)?.message || error.message;
    } else if (error.request) {
      // Request made but no response
      apiError.message = 'No response from server';
    }

    return apiError;
  }

  /**
   * Get homepage content with banners, categories, and featured sections
   */
  async getHomepage(): Promise<HomepageResponse> {
    const response = await this.client.get<HomepageResponse>('/moviebox/homepage');
    return response.data;
  }

  /**
   * Get trending movies and series
   * @param page - Page number (starts at 0)
   */
  async getTrending(page: number = 0): Promise<TrendingResponse> {
    const response = await this.client.get<TrendingResponse>('/moviebox/trending', {
      params: { page },
    });
    return response.data;
  }

  /**
   * Search for movies and series
   * @param query - Search keyword
   * @param page - Page number (starts at 1)
   */
  async search(query: string, page: number = 1): Promise<SearchResponse> {
    const response = await this.client.get<SearchResponse>('/moviebox/search', {
      params: { query, page },
    });
    return response.data;
  }

  /**
   * Get detailed information about a movie or series
   * @param subjectId - Unique movie/series ID
   */
  async getDetail(subjectId: string): Promise<DetailResponse> {
    const response = await this.client.get<DetailResponse>('/moviebox/detail', {
      params: { subjectId },
    });
    return response.data;
  }

  /**
   * Get available sources and subtitles for a specific episode/movie
   * @param subjectId - Movie/series ID
   * @param season - Season number (0 for movies, >= 1 for series)
   * @param episode - Episode number (0 for movies, >= 1 for series)
   */
  async getSources(subjectId: string, season: number = 0, episode: number = 0): Promise<SourcesResponse> {
    console.log('📡 API Request: /moviebox/sources', { subjectId, season, episode });

    const response = await this.client.get<SourcesResponse>('/moviebox/sources', {
      params: { subjectId, season, episode },
    });

    console.log('📦 API Response: /moviebox/sources', response.data);
    console.log('📹 Downloads available:', response.data?.downloads?.length || 0);

    return response.data;
  }

  /**
   * Generate validated stream URL for playback
   * @param url - Original MP4 URL from sources endpoint
   */
  async generateStreamLink(url: string): Promise<GenerateStreamResponse> {
    console.log('🔗 Generating stream link for URL:', url);

    try {
      // Don't encode - axios will handle it, and API expects raw URL in query
      const response = await this.client.get<GenerateStreamResponse>('/moviebox/generate-link-stream-video', {
        params: { url },
      });

      console.log('✅ Generate link response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Generate link error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: url,
      });
      throw error;
    }
  }

  /**
   * Complete flow to get playback-ready stream URL
   * @param subjectId - Movie/series ID
   * @param season - Season number
   * @param episode - Episode number
   * @param quality - Quality index (0 = lowest, higher = better)
   * @returns Stream URL ready for playback
   */
  async getPlaybackUrl(subjectId: string, season: number = 0, episode: number = 0, quality: number = 0): Promise<{ streamUrl: string; captions: SourcesResponse['captions'] }> {
    // Get sources
    const sources = await this.getSources(subjectId, season, episode);

    if (!sources.downloads || sources.downloads.length === 0) {
      throw new Error('No playback sources available');
    }

    // Select quality (default to first available)
    const selectedSource = sources.downloads[quality] || sources.downloads[0];

    // Generate stream link
    const streamData = await this.generateStreamLink(selectedSource.url);

    return {
      streamUrl: streamData.streamUrl,
      captions: sources.captions || [],
    };
  }
}

// Export singleton instance
export const movieBoxAPI = new MovieBoxAPI();

// Export class for testing
export default MovieBoxAPI;
