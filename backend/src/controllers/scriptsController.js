const { scripts } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Get all call scripts
 */
const getAllScripts = (req, res) => {
  try {
    const { category } = req.query;
    
    // Convert scripts object to array for easier handling
    let scriptArray = Object.values(scripts);
    
    // Filter by category if provided
    if (category) {
      scriptArray = scriptArray.filter(script => 
        script.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    return ResponseFormatter.success(res, scriptArray, 'Scripts retrieved successfully');
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return ResponseFormatter.error(res, 'Failed to fetch scripts');
  }
};

/**
 * Get scripts by type/category
 */
const getScriptsByType = (req, res) => {
  try {
    const { type } = req.params;
    
    // Look for script by ID or category
    let result = scripts[type];
    
    if (!result) {
      // Try to find by category
      const scriptArray = Object.values(scripts);
      result = scriptArray.filter(script => 
        script.category.toLowerCase() === type.toLowerCase()
      );
      
      if (result.length === 0) {
        return ResponseFormatter.notFound(res, `Script type '${type}'`);
      }
    }
    
    return ResponseFormatter.success(res, result, `Scripts for type '${type}' retrieved successfully`);
  } catch (error) {
    console.error('Error fetching scripts by type:', error);
    return ResponseFormatter.error(res, 'Failed to fetch scripts');
  }
};

/**
 * Get a specific script by ID
 */
const getScriptById = (req, res) => {
  try {
    const { id } = req.params;
    const script = scripts[id];
    
    if (!script) {
      return ResponseFormatter.notFound(res, 'Script');
    }
    
    return ResponseFormatter.success(res, script, 'Script retrieved successfully');
  } catch (error) {
    console.error('Error fetching script:', error);
    return ResponseFormatter.error(res, 'Failed to fetch script');
  }
};

/**
 * Create a new script
 */
const createScript = (req, res) => {
  try {
    const { id, title, text, color, category } = req.body;
    
    // Check if script ID already exists
    if (scripts[id]) {
      return ResponseFormatter.error(
        res,
        'Script with this ID already exists',
        409
      );
    }
    
    const newScript = {
      id,
      title,
      text,
      color: color || 'gray',
      category: category || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    scripts[id] = newScript;
    
    return ResponseFormatter.success(
      res,
      newScript,
      'Script created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating script:', error);
    return ResponseFormatter.error(res, 'Failed to create script');
  }
};

/**
 * Update a script
 */
const updateScript = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!scripts[id]) {
      return ResponseFormatter.notFound(res, 'Script');
    }
    
    // Update the script
    const updatedScript = {
      ...scripts[id],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    scripts[id] = updatedScript;
    
    return ResponseFormatter.success(res, updatedScript, 'Script updated successfully');
  } catch (error) {
    console.error('Error updating script:', error);
    return ResponseFormatter.error(res, 'Failed to update script');
  }
};

/**
 * Delete a script
 */
const deleteScript = (req, res) => {
  try {
    const { id } = req.params;
    
    if (!scripts[id]) {
      return ResponseFormatter.notFound(res, 'Script');
    }
    
    const deletedScript = scripts[id];
    delete scripts[id];
    
    return ResponseFormatter.success(res, deletedScript, 'Script deleted successfully');
  } catch (error) {
    console.error('Error deleting script:', error);
    return ResponseFormatter.error(res, 'Failed to delete script');
  }
};

/**
 * Get script categories
 */
const getScriptCategories = (req, res) => {
  try {
    const scriptArray = Object.values(scripts);
    const categories = [...new Set(scriptArray.map(script => script.category))];
    
    const categoryStats = categories.map(category => ({
      name: category,
      count: scriptArray.filter(script => script.category === category).length
    }));
    
    return ResponseFormatter.success(res, categoryStats, 'Script categories retrieved successfully');
  } catch (error) {
    console.error('Error fetching script categories:', error);
    return ResponseFormatter.error(res, 'Failed to fetch script categories');
  }
};

module.exports = {
  getAllScripts,
  getScriptsByType,
  getScriptById,
  createScript,
  updateScript,
  deleteScript,
  getScriptCategories
};