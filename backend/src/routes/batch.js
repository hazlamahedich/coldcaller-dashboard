const express = require('express');
const router = express.Router();
const batchLeadsController = require('../controllers/batchLeadsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     BatchUpload:
 *       type: object
 *       properties:
 *         batchId:
 *           type: string
 *           description: Unique identifier for the batch
 *         filename:
 *           type: string
 *           description: Original filename
 *         fileSize:
 *           type: number
 *           description: File size in bytes
 *         analysis:
 *           type: object
 *           description: LLM analysis of the file format and content
 *     
 *     BatchStatus:
 *       type: object
 *       properties:
 *         batchId:
 *           type: string
 *         filename:
 *           type: string
 *         status:
 *           type: string
 *           enum: [uploaded, analyzed, processing, completed, failed]
 *         processedCount:
 *           type: number
 *         totalCount:
 *           type: number
 *         progress:
 *           type: string
 *           description: Progress percentage
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *         duplicates:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /api/batch/upload:
 *   post:
 *     summary: Upload file for batch lead processing
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Data file (CSV, JSON, TXT, Excel, XML)
 *     responses:
 *       200:
 *         description: File uploaded and analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchUpload'
 *       400:
 *         description: Bad request - invalid file or format
 *       500:
 *         description: Server error
 */
router.post('/upload', batchLeadsController.uploadFile.bind(batchLeadsController));

/**
 * @swagger
 * /api/batch/{batchId}/preview:
 *   get:
 *     summary: Preview parsed data before processing
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Preview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 analysis:
 *                   type: object
 *                 preview:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalPreview:
 *                   type: number
 *                 estimatedTotal:
 *                   type: number
 *       404:
 *         description: Batch not found
 */
router.get('/:batchId/preview', batchLeadsController.previewBatch.bind(batchLeadsController));

/**
 * @swagger
 * /api/batch/{batchId}/process:
 *   post:
 *     summary: Start processing the batch
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: Skip duplicate leads
 *               updateExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Update existing leads if duplicates found
 *     responses:
 *       200:
 *         description: Processing started
 *       404:
 *         description: Batch not found
 */
router.post('/:batchId/process', batchLeadsController.processBatch.bind(batchLeadsController));

/**
 * @swagger
 * /api/batch/{batchId}/status:
 *   get:
 *     summary: Get batch processing status
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchStatus'
 *       404:
 *         description: Batch not found
 */
router.get('/:batchId/status', batchLeadsController.getBatchStatus.bind(batchLeadsController));

/**
 * @swagger
 * /api/batch:
 *   get:
 *     summary: List all batches
 *     tags: [Batch Operations]
 *     responses:
 *       200:
 *         description: List of batches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       filename:
 *                         type: string
 *                       status:
 *                         type: string
 *                       processedCount:
 *                         type: number
 *                       totalCount:
 *                         type: number
 *                       uploadedAt:
 *                         type: string
 *                       progress:
 *                         type: string
 */
router.get('/', batchLeadsController.listBatches.bind(batchLeadsController));

/**
 * @swagger
 * /api/batch/{batchId}:
 *   delete:
 *     summary: Delete a batch
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *       404:
 *         description: Batch not found
 */
router.delete('/:batchId', batchLeadsController.deleteBatch.bind(batchLeadsController));

module.exports = router;