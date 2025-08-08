/**
 * Transcription Service - Call recording transcription and speech analytics
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const SpeechAnalyticsService = require('./speechAnalyticsService');

class TranscriptionService {
  constructor() {
    this.providers = {
      whisper: this.transcribeWithWhisper.bind(this),
      google: this.transcribeWithGoogle.bind(this),
      aws: this.transcribeWithAWS.bind(this),
      azure: this.transcribeWithAzure.bind(this)
    };
    
    this.config = {
      whisper: {
        apiUrl: process.env.WHISPER_API_URL || 'http://localhost:9000/asr',
        model: process.env.WHISPER_MODEL || 'base'
      },
      google: {
        apiKey: process.env.GOOGLE_SPEECH_API_KEY,
        apiUrl: 'https://speech.googleapis.com/v1/speech:recognize'
      },
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      azure: {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'eastus'
      }
    };
  }

  /**
   * Main transcription method - routes to appropriate provider
   */
  async transcribeRecording({ callId, recordingUrl, provider = 'whisper', language = 'en', includeAnalytics = true }) {
    try {
      console.log(`Starting transcription for call ${callId} using ${provider}`);
      
      // Download recording file if URL is remote
      const audioFilePath = await this.downloadRecording(recordingUrl, callId);
      
      // Select transcription provider
      const transcribeFunction = this.providers[provider];
      if (!transcribeFunction) {
        throw new Error(`Unsupported transcription provider: ${provider}`);
      }
      
      // Perform transcription
      const transcriptionResult = await transcribeFunction(audioFilePath, language);
      
      // Enhance with speech analytics if requested
      let speechAnalytics = null;
      if (includeAnalytics && transcriptionResult.text) {
        speechAnalytics = await SpeechAnalyticsService.analyzeTranscription(
          transcriptionResult.text,
          transcriptionResult.segments || [],
          audioFilePath
        );
      }
      
      // Clean up temporary files
      await this.cleanupTempFiles(audioFilePath);
      
      const result = {
        callId,
        provider,
        language,
        text: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        confidence: transcriptionResult.confidence || 0.85,
        accuracy: transcriptionResult.accuracy || null,
        processingTime: transcriptionResult.processingTime,
        wordCount: transcriptionResult.text ? transcriptionResult.text.split(' ').length : 0,
        analytics: speechAnalytics,
        transcribedAt: new Date(),
        metadata: {
          audioFormat: transcriptionResult.audioFormat,
          duration: transcriptionResult.duration,
          sampleRate: transcriptionResult.sampleRate,
          channels: transcriptionResult.channels
        }
      };
      
      console.log(`Transcription completed for call ${callId}: ${result.wordCount} words`);
      return result;
      
    } catch (error) {
      console.error(`Transcription failed for call ${callId}:`, error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Whisper API transcription (local or remote)
   */
  async transcribeWithWhisper(audioFilePath, language) {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      const audioBuffer = await fs.readFile(audioFilePath);
      
      formData.append('audio_file', audioBuffer, {
        filename: path.basename(audioFilePath),
        contentType: this.getAudioMimeType(audioFilePath)
      });
      
      formData.append('task', 'transcribe');
      formData.append('language', language);
      formData.append('output', 'json');
      formData.append('timestamp_granularities[]', 'segment');
      formData.append('timestamp_granularities[]', 'word');
      
      const response = await axios.post(this.config.whisper.apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.WHISPER_API_KEY || ''}`
        },
        timeout: 300000 // 5 minutes
      });
      
      const data = response.data;
      const processingTime = Date.now() - startTime;
      
      return {
        text: data.text || '',
        segments: data.segments || [],
        confidence: this.calculateAverageConfidence(data.segments),
        processingTime,
        audioFormat: this.getAudioFormat(audioFilePath),
        duration: data.duration,
        language: data.language
      };
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Whisper API server is not available');
      }
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  /**
   * Google Speech-to-Text API transcription
   */
  async transcribeWithGoogle(audioFilePath, language) {
    const startTime = Date.now();
    
    try {
      const audioBuffer = await fs.readFile(audioFilePath);
      const audioContent = audioBuffer.toString('base64');
      
      const requestBody = {
        config: {
          encoding: this.getGoogleAudioEncoding(audioFilePath),
          sampleRateHertz: 16000,
          languageCode: this.mapLanguageToGoogle(language),
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          maxAlternatives: 1
        },
        audio: {
          content: audioContent
        }
      };
      
      const response = await axios.post(
        `${this.config.google.apiUrl}?key=${this.config.google.apiKey}`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000
        }
      );
      
      const results = response.data.results || [];
      const transcript = results
        .map(result => result.alternatives[0]?.transcript || '')
        .join(' ');
      
      const segments = this.convertGoogleResultsToSegments(results);
      const processingTime = Date.now() - startTime;
      
      return {
        text: transcript,
        segments,
        confidence: this.calculateAverageConfidence(segments),
        processingTime,
        audioFormat: this.getAudioFormat(audioFilePath)
      };
      
    } catch (error) {
      throw new Error(`Google Speech-to-Text failed: ${error.message}`);
    }
  }

  /**
   * AWS Transcribe service
   */
  async transcribeWithAWS(audioFilePath, language) {
    // Implementation for AWS Transcribe would go here
    // For now, fallback to Whisper
    console.log('AWS Transcribe not implemented, falling back to Whisper');
    return await this.transcribeWithWhisper(audioFilePath, language);
  }

  /**
   * Azure Speech Services
   */
  async transcribeWithAzure(audioFilePath, language) {
    // Implementation for Azure Speech would go here
    // For now, fallback to Whisper
    console.log('Azure Speech not implemented, falling back to Whisper');
    return await this.transcribeWithWhisper(audioFilePath, language);
  }

  /**
   * Download recording from URL to temporary file
   */
  async downloadRecording(recordingUrl, callId) {
    try {
      // If it's already a local file path, return it
      if (!recordingUrl.startsWith('http')) {
        if (await this.fileExists(recordingUrl)) {
          return recordingUrl;
        }
        throw new Error(`Recording file not found: ${recordingUrl}`);
      }
      
      // Download remote file
      const response = await axios({
        method: 'GET',
        url: recordingUrl,
        responseType: 'stream',
        timeout: 120000 // 2 minutes
      });
      
      const tempDir = path.join(__dirname, '../../temp/transcriptions');
      await fs.mkdir(tempDir, { recursive: true });
      
      const fileExtension = path.extname(recordingUrl) || '.mp3';
      const tempFilePath = path.join(tempDir, `${callId}_${Date.now()}${fileExtension}`);
      
      const writer = require('fs').createWriteStream(tempFilePath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', reject);
      });
      
    } catch (error) {
      throw new Error(`Failed to download recording: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePath) {
    try {
      if (filePath && filePath.includes('/temp/')) {
        await fs.unlink(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error.message);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get audio MIME type based on file extension
   */
  getAudioMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm'
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Get audio format for metadata
   */
  getAudioFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext.substring(1); // Remove the dot
  }

  /**
   * Get Google Speech encoding format
   */
  getGoogleAudioEncoding(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const encodings = {
      '.wav': 'LINEAR16',
      '.mp3': 'MP3',
      '.m4a': 'MP3',
      '.flac': 'FLAC',
      '.ogg': 'OGG_OPUS'
    };
    return encodings[ext] || 'MP3';
  }

  /**
   * Map language codes to Google format
   */
  mapLanguageToGoogle(language) {
    const languageMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'nl': 'nl-NL',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN'
    };
    return languageMap[language] || 'en-US';
  }

  /**
   * Calculate average confidence from segments
   */
  calculateAverageConfidence(segments) {
    if (!segments || segments.length === 0) return 0.85;
    
    const confidenceSum = segments.reduce((sum, segment) => {
      return sum + (segment.confidence || segment.avg_logprob || 0.85);
    }, 0);
    
    return Math.max(0, Math.min(1, confidenceSum / segments.length));
  }

  /**
   * Convert Google results to standard segment format
   */
  convertGoogleResultsToSegments(results) {
    const segments = [];
    
    results.forEach((result, index) => {
      const alternative = result.alternatives[0];
      if (!alternative) return;
      
      const words = alternative.words || [];
      let segmentText = alternative.transcript || '';
      
      // Group words into segments (approximately 10-second chunks)
      let currentSegment = {
        id: index,
        text: segmentText,
        start: words.length > 0 ? this.parseGoogleTime(words[0].startTime) : 0,
        end: words.length > 0 ? this.parseGoogleTime(words[words.length - 1].endTime) : 0,
        confidence: alternative.confidence || 0.85,
        words: words.map(word => ({
          word: word.word,
          start: this.parseGoogleTime(word.startTime),
          end: this.parseGoogleTime(word.endTime),
          confidence: word.confidence || 0.85
        }))
      };
      
      segments.push(currentSegment);
    });
    
    return segments;
  }

  /**
   * Parse Google time format to seconds
   */
  parseGoogleTime(timeString) {
    if (!timeString) return 0;
    // Google returns time as "1.234s"
    return parseFloat(timeString.replace('s', '')) || 0;
  }

  /**
   * Batch transcribe multiple recordings
   */
  async batchTranscribe(recordings, options = {}) {
    const results = [];
    const errors = [];
    
    const concurrency = options.concurrency || 3;
    const provider = options.provider || 'whisper';
    const language = options.language || 'en';
    
    console.log(`Starting batch transcription of ${recordings.length} recordings`);
    
    // Process recordings in batches
    for (let i = 0; i < recordings.length; i += concurrency) {
      const batch = recordings.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (recording) => {
        try {
          const result = await this.transcribeRecording({
            callId: recording.callId,
            recordingUrl: recording.url,
            provider,
            language,
            includeAnalytics: options.includeAnalytics !== false
          });
          return { success: true, callId: recording.callId, result };
        } catch (error) {
          return { success: false, callId: recording.callId, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result.result);
        } else {
          errors.push({ callId: result.callId, error: result.error });
        }
      });
      
      console.log(`Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(recordings.length / concurrency)}`);
    }
    
    console.log(`Batch transcription completed: ${results.length} successful, ${errors.length} failed`);
    
    return {
      results,
      errors,
      summary: {
        total: recordings.length,
        successful: results.length,
        failed: errors.length,
        provider,
        language,
        completedAt: new Date()
      }
    };
  }

  /**
   * Get transcription status and progress
   */
  async getTranscriptionStatus(callId) {
    // This would check the status of ongoing transcriptions
    // For now, return a mock status
    return {
      callId,
      status: 'completed', // or 'processing', 'failed', 'pending'
      progress: 100,
      estimatedCompletion: null,
      lastUpdated: new Date()
    };
  }

  /**
   * Cancel ongoing transcription
   */
  async cancelTranscription(callId) {
    // Implementation for canceling transcriptions
    console.log(`Cancelling transcription for call ${callId}`);
    return { callId, status: 'cancelled', cancelledAt: new Date() };
  }

  /**
   * Get supported providers and their capabilities
   */
  getProviderCapabilities() {
    return {
      whisper: {
        name: 'OpenAI Whisper',
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh'],
        features: ['word_timestamps', 'segments', 'confidence_scores'],
        audioFormats: ['mp3', 'wav', 'm4a', 'flac', 'ogg'],
        maxFileSize: '25MB',
        avgProcessingTime: '30s per minute of audio'
      },
      google: {
        name: 'Google Speech-to-Text',
        languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'],
        features: ['word_timestamps', 'confidence_scores', 'speaker_diarization'],
        audioFormats: ['wav', 'flac', 'mp3'],
        maxFileSize: '10MB',
        avgProcessingTime: '20s per minute of audio'
      },
      aws: {
        name: 'Amazon Transcribe',
        languages: ['en-US', 'es-US', 'fr-CA', 'de-DE'],
        features: ['word_timestamps', 'confidence_scores', 'custom_vocabularies'],
        audioFormats: ['wav', 'mp3', 'mp4', 'flac'],
        maxFileSize: '2GB',
        avgProcessingTime: '25s per minute of audio'
      },
      azure: {
        name: 'Azure Speech Services',
        languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'],
        features: ['word_timestamps', 'confidence_scores', 'real_time'],
        audioFormats: ['wav', 'mp3', 'ogg'],
        maxFileSize: '1GB',
        avgProcessingTime: '15s per minute of audio'
      }
    };
  }
}

module.exports = new TranscriptionService();