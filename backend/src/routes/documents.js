/**
 * Document Routes for RAG Chatbot
 * Serves documents and files referenced by the chatbot
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { validationResult, param } = require('express-validator');

// Helper function to check if an ID is just a simple filename
const isSimpleFilename = (id) => {
  return !id.includes('/') && (id.endsWith('.md') || id.endsWith('.txt') || id.endsWith('.json'));
};

/**
 * Get document by ID or file path
 * GET /api/documents/:id
 * GET /api/documents/file/:filePath
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('Document ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    
    // For this implementation, we'll serve files directly from the project directory
    // In production, you might want to serve from a dedicated document storage
    const projectRoot = path.join(__dirname, '../../../');
    let filePath;

    // Check if ID is actually a file path (URL encoded) but not a simple filename
    if ((id.includes('/') || id.includes('src')) && !isSimpleFilename(id)) {
      // Decode and construct file path
      const decodedPath = decodeURIComponent(id);
      
      // Handle various path formats from RAG system
      if (decodedPath.startsWith('src/')) {
        filePath = path.join(projectRoot, 'backend', decodedPath);
      } else if (decodedPath.startsWith('../')) {
        // Handle relative paths like ../TWILIO_SETUP_GUIDE.md
        filePath = path.resolve(projectRoot, decodedPath);
      } else if (decodedPath.includes('/')) {
        // Handle full relative paths
        filePath = path.resolve(projectRoot, decodedPath);
      } else {
        // Simple filename
        filePath = path.join(projectRoot, decodedPath);
      }
    } else {
      // Handle specific document IDs and expand for more files
      const documentMap = {
        'readme': 'README.md',
        'start-guide': 'START_GUIDE.md',
        'twilio-setup': 'TWILIO_SETUP_GUIDE.md',
        'twilio-integration': 'TWILIO_INTEGRATION_SUMMARY.md',
        'quick-twilio-start': 'QUICK_TWILIO_START.md',
        'chatbot-spec': 'RAG_CHATBOT_SPECIFICATION_UPDATED.md',
        // Add more common document mappings
        'TWILIO_SETUP_GUIDE.md': 'TWILIO_SETUP_GUIDE.md',
        'TWILIO_INTEGRATION_SUMMARY.md': 'TWILIO_INTEGRATION_SUMMARY.md',
        'RAG_CHATBOT_README.md': 'backend/src/services/RAG_CHATBOT_README.md',
        'TWILIO_TEST_GUIDE.md': 'TWILIO_TEST_GUIDE.md',
        'QUICK_START_GUIDE.md': 'docs/QUICK_START_GUIDE.md',
        'USER_MANUAL.md': 'docs/USER_MANUAL.md',
        'COMPREHENSIVE_FAQ.md': 'docs/COMPREHENSIVE_FAQ.md',
        'RAG_IMPLEMENTATION_COMPLETE.md': 'RAG_IMPLEMENTATION_COMPLETE.md',
        'DEPLOYMENT_GUIDE.md': 'docs/DEPLOYMENT_GUIDE.md',
        'API_DOCUMENTATION_ENHANCED.md': 'docs/API_DOCUMENTATION_ENHANCED.md'
      };

      if (documentMap[id]) {
        filePath = path.join(projectRoot, documentMap[id]);
      } else {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Document not found',
            code: 'DOCUMENT_NOT_FOUND'
          }
        });
      }
    }

    // Security check: ensure file is within project directory or parent directory
    const resolvedPath = path.resolve(filePath);
    const allowedRoot = path.resolve(projectRoot, '..');
    if (!resolvedPath.startsWith(allowedRoot)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'DOCUMENT_ACCESS_DENIED'
        }
      });
    }

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document file not found',
          code: 'DOCUMENT_FILE_NOT_FOUND',
          filePath: path.relative(projectRoot, filePath)
        }
      });
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Determine content type
    let contentType = 'text/plain';
    if (extension === '.md') {
      contentType = 'text/markdown';
    } else if (extension === '.json') {
      contentType = 'application/json';
    } else if (extension === '.html') {
      contentType = 'text/html';
    }

    // Set response headers
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Last-Modified': stats.mtime.toUTCString(),
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // For markdown files, you might want to render as HTML
    if (extension === '.md' && req.query.render === 'html') {
      // Simple markdown to HTML conversion (you could use a proper markdown library)
      let htmlContent = content
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <p>${htmlContent}</p>
</body>
</html>`;
      
      res.set('Content-Type', 'text/html');
      return res.send(htmlContent);
    }

    // Return raw content
    res.send(content);

  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'DOCUMENT_SERVE_ERROR'
      }
    });
  }
});

/**
 * List available documents
 * GET /api/documents
 */
router.get('/', async (req, res) => {
  try {
    const projectRoot = path.join(__dirname, '../../../');
    
    const availableDocuments = [
      {
        id: 'readme',
        title: 'Project README',
        description: 'Main project documentation and overview',
        filePath: 'README.md',
        url: '/api/documents/readme',
        category: 'project'
      },
      {
        id: 'start-guide',
        title: 'Getting Started Guide',
        description: 'Step-by-step guide to get started with ColdCaller',
        filePath: 'START_GUIDE.md',
        url: '/api/documents/start-guide',
        category: 'tutorial'
      },
      {
        id: 'twilio-setup',
        title: 'Twilio Setup Guide',
        description: 'Complete guide for setting up Twilio integration',
        filePath: 'TWILIO_SETUP_GUIDE.md',
        url: '/api/documents/twilio-setup',
        category: 'integration'
      },
      {
        id: 'twilio-integration',
        title: 'Twilio Integration Summary',
        description: 'Overview of Twilio integration features',
        filePath: 'TWILIO_INTEGRATION_SUMMARY.md',
        url: '/api/documents/twilio-integration',
        category: 'integration'
      },
      {
        id: 'quick-twilio-start',
        title: 'Quick Twilio Start',
        description: 'Quick start guide for Twilio integration',
        filePath: 'QUICK_TWILIO_START.md',
        url: '/api/documents/quick-twilio-start',
        category: 'tutorial'
      },
      {
        id: 'chatbot-spec',
        title: 'Chatbot Specification',
        description: 'Technical specification for the RAG chatbot',
        filePath: 'RAG_CHATBOT_SPECIFICATION_UPDATED.md',
        url: '/api/documents/chatbot-spec',
        category: 'reference'
      }
    ];

    // Filter only existing files
    const existingDocuments = [];
    for (const doc of availableDocuments) {
      const filePath = path.join(projectRoot, doc.filePath);
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        existingDocuments.push({
          ...doc,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          exists: true
        });
      }
    }

    res.json({
      success: true,
      data: {
        documents: existingDocuments,
        total: existingDocuments.length,
        categories: [...new Set(existingDocuments.map(doc => doc.category))]
      }
    });

  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list documents',
        code: 'DOCUMENT_LIST_ERROR'
      }
    });
  }
});

/**
 * Get document metadata
 * GET /api/documents/:id/metadata
 */
router.get('/:id/metadata', [
  param('id').notEmpty().withMessage('Document ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const projectRoot = path.join(__dirname, '../../../');
    
    const documentMap = {
      'readme': 'README.md',
      'start-guide': 'START_GUIDE.md',
      'twilio-setup': 'TWILIO_SETUP_GUIDE.md',
      'twilio-integration': 'TWILIO_INTEGRATION_SUMMARY.md',
      'quick-twilio-start': 'QUICK_TWILIO_START.md',
      'chatbot-spec': 'RAG_CHATBOT_SPECIFICATION_UPDATED.md'
    };

    const fileName = documentMap[id];
    if (!fileName) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        }
      });
    }

    const filePath = path.join(projectRoot, fileName);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document file not found',
          code: 'DOCUMENT_FILE_NOT_FOUND'
        }
      });
    }

    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Extract basic metadata
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const lineCount = content.split('\n').length;
    
    // Extract title from first heading in markdown
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(fileName, path.extname(fileName));

    const metadata = {
      id,
      title,
      fileName,
      filePath: path.relative(projectRoot, filePath),
      size: stats.size,
      wordCount,
      lineCount,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      extension: path.extname(fileName).toLowerCase(),
      url: `/api/documents/${id}`,
      renderUrl: `/api/documents/${id}?render=html`,
      downloadUrl: `/api/documents/${id}?download=true`
    };

    res.json({
      success: true,
      data: metadata
    });

  } catch (error) {
    console.error('Error getting document metadata:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get document metadata',
        code: 'DOCUMENT_METADATA_ERROR'
      }
    });
  }
});

module.exports = router;