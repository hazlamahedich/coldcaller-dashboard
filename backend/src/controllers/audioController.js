const { audioClips } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Get all audio clips with optional filtering
 */
const getAllAudioClips = (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    let filteredClips = [...audioClips];
    
    // Filter by category if provided
    if (category) {
      filteredClips = filteredClips.filter(clip => 
        clip.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedClips = filteredClips.slice(startIndex, endIndex);
    
    return ResponseFormatter.paginated(
      res,
      paginatedClips,
      page,
      limit,
      filteredClips.length,
      'Audio clips retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching audio clips:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio clips');
  }
};

/**
 * Get audio clips by category
 */
const getAudioClipsByCategory = (req, res) => {
  try {
    const { category } = req.params;
    
    const filteredClips = audioClips.filter(clip => 
      clip.category.toLowerCase() === category.toLowerCase()
    );
    
    if (filteredClips.length === 0) {
      return ResponseFormatter.notFound(res, `Audio clips for category '${category}'`);
    }
    
    return ResponseFormatter.success(
      res,
      filteredClips,
      `Audio clips for category '${category}' retrieved successfully`
    );
  } catch (error) {
    console.error('Error fetching audio clips by category:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio clips');
  }
};

/**
 * Get a specific audio clip by ID
 */
const getAudioClipById = (req, res) => {
  try {
    const { id } = req.params;
    const clip = audioClips.find(c => c.id === parseInt(id));
    
    if (!clip) {
      return ResponseFormatter.notFound(res, 'Audio clip');
    }
    
    return ResponseFormatter.success(res, clip, 'Audio clip retrieved successfully');
  } catch (error) {
    console.error('Error fetching audio clip:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio clip');
  }
};

/**
 * Create a new audio clip
 */
const createAudioClip = (req, res) => {
  try {
    const { name, category, duration, url } = req.body;
    
    // Generate new ID
    const newId = Math.max(...audioClips.map(c => c.id), 0) + 1;
    
    const newClip = {
      id: newId,
      name,
      category,
      duration: duration || "0:00",
      url: url || `/audio/${name.toLowerCase().replace(/\s+/g, '-')}.mp3`,
      createdAt: new Date().toISOString()
    };
    
    audioClips.push(newClip);
    
    return ResponseFormatter.success(
      res,
      newClip,
      'Audio clip created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating audio clip:', error);
    return ResponseFormatter.error(res, 'Failed to create audio clip');
  }
};

/**
 * Update an audio clip
 */
const updateAudioClip = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const clipIndex = audioClips.findIndex(c => c.id === parseInt(id));
    if (clipIndex === -1) {
      return ResponseFormatter.notFound(res, 'Audio clip');
    }
    
    // Update the clip
    const updatedClip = {
      ...audioClips[clipIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    audioClips[clipIndex] = updatedClip;
    
    return ResponseFormatter.success(res, updatedClip, 'Audio clip updated successfully');
  } catch (error) {
    console.error('Error updating audio clip:', error);
    return ResponseFormatter.error(res, 'Failed to update audio clip');
  }
};

/**
 * Delete an audio clip
 */
const deleteAudioClip = (req, res) => {
  try {
    const { id } = req.params;
    const clipIndex = audioClips.findIndex(c => c.id === parseInt(id));
    
    if (clipIndex === -1) {
      return ResponseFormatter.notFound(res, 'Audio clip');
    }
    
    const deletedClip = audioClips.splice(clipIndex, 1)[0];
    
    return ResponseFormatter.success(res, deletedClip, 'Audio clip deleted successfully');
  } catch (error) {
    console.error('Error deleting audio clip:', error);
    return ResponseFormatter.error(res, 'Failed to delete audio clip');
  }
};

/**
 * Get audio clip categories with statistics
 */
const getAudioCategories = (req, res) => {
  try {
    const categories = [...new Set(audioClips.map(clip => clip.category))];
    
    const categoryStats = categories.map(category => ({
      name: category,
      count: audioClips.filter(clip => clip.category === category).length,
      totalDuration: audioClips
        .filter(clip => clip.category === category)
        .reduce((total, clip) => {
          // Simple duration parsing (assumes format like "0:15")
          const [minutes, seconds] = clip.duration.split(':').map(Number);
          return total + (minutes * 60) + seconds;
        }, 0)
    }));
    
    return ResponseFormatter.success(res, categoryStats, 'Audio categories retrieved successfully');
  } catch (error) {
    console.error('Error fetching audio categories:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio categories');
  }
};

/**
 * Search audio clips by name
 */
const searchAudioClips = (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return ResponseFormatter.error(res, 'Search query is required', 400);
    }
    
    const searchResults = audioClips.filter(clip =>
      clip.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return ResponseFormatter.success(
      res,
      searchResults,
      `Found ${searchResults.length} audio clips matching '${query}'`
    );
  } catch (error) {
    console.error('Error searching audio clips:', error);
    return ResponseFormatter.error(res, 'Failed to search audio clips');
  }
};

module.exports = {
  getAllAudioClips,
  getAudioClipsByCategory,
  getAudioClipById,
  createAudioClip,
  updateAudioClip,
  deleteAudioClip,
  getAudioCategories,
  searchAudioClips
};