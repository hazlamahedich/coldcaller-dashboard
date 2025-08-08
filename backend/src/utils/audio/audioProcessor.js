const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const execAsync = promisify(exec);

/**
 * Audio processing utilities using FFmpeg
 */
class AudioProcessor {
  constructor() {
    this.ffmpegPath = ffmpegPath;
  }

  /**
   * Extract metadata from audio file
   * @param {string} filePath - Path to audio file
   * @returns {Promise<object>} Audio metadata
   */
  async extractMetadata(filePath) {
    try {
      const command = `"${this.ffmpegPath}" -i "${filePath}" -f null - 2>&1`;
      const { stdout, stderr } = await execAsync(command);
      const output = stdout + stderr;

      const metadata = {
        duration: this.parseDuration(output),
        format: this.parseFormat(output),
        bitrate: this.parseBitrate(output),
        sampleRate: this.parseSampleRate(output),
        channels: this.parseChannels(output),
        size: (await fs.stat(filePath)).size,
        codec: this.parseCodec(output)
      };

      return metadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw new Error('Failed to extract audio metadata');
    }
  }

  /**
   * Convert audio to MP3 format
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {object} options - Conversion options
   * @returns {Promise<string>} Path to converted file
   */
  async convertToMp3(inputPath, outputPath, options = {}) {
    try {
      const {
        bitrate = '128k',
        sampleRate = '44100',
        channels = '2'
      } = options;

      const command = `"${this.ffmpegPath}" -i "${inputPath}" -codec:a libmp3lame -b:a ${bitrate} -ar ${sampleRate} -ac ${channels} "${outputPath}" -y`;
      
      await execAsync(command);
      return outputPath;
    } catch (error) {
      console.error('Error converting to MP3:', error);
      throw new Error('Failed to convert audio to MP3');
    }
  }

  /**
   * Compress audio file
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {string} quality - Quality level (high, medium, low)
   * @returns {Promise<string>} Path to compressed file
   */
  async compressAudio(inputPath, outputPath, quality = 'medium') {
    try {
      const qualitySettings = {
        high: { bitrate: '192k', quality: '2' },
        medium: { bitrate: '128k', quality: '4' },
        low: { bitrate: '96k', quality: '6' }
      };

      const settings = qualitySettings[quality] || qualitySettings.medium;
      const command = `"${this.ffmpegPath}" -i "${inputPath}" -codec:a libmp3lame -b:a ${settings.bitrate} -q:a ${settings.quality} "${outputPath}" -y`;
      
      await execAsync(command);
      return outputPath;
    } catch (error) {
      console.error('Error compressing audio:', error);
      throw new Error('Failed to compress audio');
    }
  }

  /**
   * Generate audio waveform data
   * @param {string} filePath - Path to audio file
   * @param {number} samples - Number of samples for waveform
   * @returns {Promise<Array>} Waveform data array
   */
  async generateWaveform(filePath, samples = 1000) {
    try {
      const tempPath = path.join(path.dirname(filePath), `temp_${Date.now()}.raw`);
      
      // Extract raw audio data
      const command = `"${this.ffmpegPath}" -i "${filePath}" -f f64le -ac 1 -ar 8000 "${tempPath}" -y`;
      await execAsync(command);

      // Read raw audio data
      const buffer = await fs.readFile(tempPath);
      const audioData = new Float64Array(buffer.buffer);

      // Generate waveform samples
      const chunkSize = Math.floor(audioData.length / samples);
      const waveform = [];

      for (let i = 0; i < samples; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = audioData.slice(start, end);
        
        // Calculate RMS (Root Mean Square) for this chunk
        const rms = Math.sqrt(chunk.reduce((sum, val) => sum + val * val, 0) / chunk.length);
        waveform.push(Math.min(rms * 100, 100)); // Normalize to 0-100
      }

      // Cleanup temp file
      await fs.remove(tempPath);

      return waveform;
    } catch (error) {
      console.error('Error generating waveform:', error);
      return new Array(samples).fill(0); // Return flat waveform on error
    }
  }

  /**
   * Trim audio file
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @returns {Promise<string>} Path to trimmed file
   */
  async trimAudio(inputPath, outputPath, startTime, duration) {
    try {
      const command = `"${this.ffmpegPath}" -i "${inputPath}" -ss ${startTime} -t ${duration} -codec copy "${outputPath}" -y`;
      await execAsync(command);
      return outputPath;
    } catch (error) {
      console.error('Error trimming audio:', error);
      throw new Error('Failed to trim audio');
    }
  }

  /**
   * Normalize audio volume
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {number} targetDb - Target dB level
   * @returns {Promise<string>} Path to normalized file
   */
  async normalizeAudio(inputPath, outputPath, targetDb = -16) {
    try {
      const command = `"${this.ffmpegPath}" -i "${inputPath}" -filter:a "dynaudnorm=p=0.9:m=10.0:s=12.0:g=15" "${outputPath}" -y`;
      await execAsync(command);
      return outputPath;
    } catch (error) {
      console.error('Error normalizing audio:', error);
      throw new Error('Failed to normalize audio');
    }
  }

  // Helper methods for parsing FFmpeg output
  parseDuration(output) {
    const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (match) {
      const [, hours, minutes, seconds] = match;
      return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
  }

  parseFormat(output) {
    const match = output.match(/Input #0, ([^,]+)/);
    return match ? match[1].trim() : 'unknown';
  }

  parseBitrate(output) {
    const match = output.match(/bitrate: (\d+) kb\/s/);
    return match ? parseInt(match[1]) : 0;
  }

  parseSampleRate(output) {
    const match = output.match(/(\d+) Hz/);
    return match ? parseInt(match[1]) : 0;
  }

  parseChannels(output) {
    const match = output.match(/(mono|stereo|\d+ channels)/);
    if (match) {
      const channelInfo = match[1];
      if (channelInfo === 'mono') return 1;
      if (channelInfo === 'stereo') return 2;
      const channelMatch = channelInfo.match(/(\d+) channels/);
      return channelMatch ? parseInt(channelMatch[1]) : 2;
    }
    return 2;
  }

  parseCodec(output) {
    const match = output.match(/Audio: ([^,\s]+)/);
    return match ? match[1] : 'unknown';
  }
}

module.exports = new AudioProcessor();