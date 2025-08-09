const logger = require('./logger');

/**
 * Embedding Utilities
 * Helper functions for vector embedding operations
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vectorA - First vector
 * @param {Array<number>} vectorB - Second vector
 * @returns {number} - Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    throw new Error('Both inputs must be arrays');
  }

  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  if (vectorA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 * @param {Array<number>} vectorA - First vector
 * @param {Array<number>} vectorB - Second vector
 * @returns {number} - Euclidean distance
 */
function euclideanDistance(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    throw new Error('Both inputs must be arrays');
  }

  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 * @param {Array<number>} vector - Input vector
 * @returns {Array<number>} - Normalized vector
 */
function normalizeVector(vector) {
  if (!Array.isArray(vector)) {
    throw new Error('Input must be an array');
  }

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    return new Array(vector.length).fill(0);
  }

  return vector.map(val => val / magnitude);
}

/**
 * Calculate the centroid (average) of multiple vectors
 * @param {Array<Array<number>>} vectors - Array of vectors
 * @returns {Array<number>} - Centroid vector
 */
function calculateCentroid(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error('Input must be a non-empty array of vectors');
  }

  const dimension = vectors[0].length;
  
  // Validate all vectors have same dimension
  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== dimension) {
      throw new Error('All vectors must have the same length');
    }
  }

  const centroid = new Array(dimension).fill(0);
  
  for (const vector of vectors) {
    for (let i = 0; i < dimension; i++) {
      centroid[i] += vector[i];
    }
  }

  return centroid.map(val => val / vectors.length);
}

/**
 * Find the k most similar vectors to a query vector
 * @param {Array<number>} queryVector - Query vector
 * @param {Array<Object>} documents - Array of documents with embeddings
 * @param {number} k - Number of results to return
 * @param {string} metric - Similarity metric ('cosine' or 'euclidean')
 * @returns {Array<Object>} - Sorted array of documents with similarity scores
 */
function findSimilarVectors(queryVector, documents, k = 5, metric = 'cosine') {
  if (!Array.isArray(queryVector)) {
    throw new Error('Query vector must be an array');
  }

  if (!Array.isArray(documents)) {
    throw new Error('Documents must be an array');
  }

  const results = documents.map(doc => {
    if (!doc.embedding || !Array.isArray(doc.embedding)) {
      logger.warn(`Document ${doc.id || 'unknown'} has invalid embedding`);
      return { ...doc, similarity: 0 };
    }

    let similarity;
    if (metric === 'cosine') {
      similarity = cosineSimilarity(queryVector, doc.embedding);
    } else if (metric === 'euclidean') {
      const distance = euclideanDistance(queryVector, doc.embedding);
      // Convert distance to similarity (higher = more similar)
      similarity = 1 / (1 + distance);
    } else {
      throw new Error('Unsupported similarity metric. Use "cosine" or "euclidean"');
    }

    return { ...doc, similarity };
  });

  // Sort by similarity (highest first) and return top k
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Validate embedding vector
 * @param {Array<number>} embedding - Embedding to validate
 * @param {number} expectedDimension - Expected dimension (default 768 for Gemini)
 * @returns {boolean} - True if valid
 */
function validateEmbedding(embedding, expectedDimension = 768) {
  if (!Array.isArray(embedding)) {
    return false;
  }

  if (embedding.length !== expectedDimension) {
    return false;
  }

  // Check all elements are numbers and finite
  return embedding.every(val => 
    typeof val === 'number' && 
    isFinite(val) && 
    !isNaN(val)
  );
}

/**
 * Convert embedding to string for database storage
 * @param {Array<number>} embedding - Embedding array
 * @returns {string} - String representation
 */
function embeddingToString(embedding) {
  if (!validateEmbedding(embedding)) {
    throw new Error('Invalid embedding vector');
  }

  return `[${embedding.join(',')}]`;
}

/**
 * Parse embedding from string
 * @param {string} embeddingString - String representation
 * @returns {Array<number>} - Embedding array
 */
function stringToEmbedding(embeddingString) {
  try {
    const embedding = JSON.parse(embeddingString);
    
    if (!validateEmbedding(embedding)) {
      throw new Error('Parsed embedding is invalid');
    }

    return embedding;
  } catch (error) {
    throw new Error(`Failed to parse embedding: ${error.message}`);
  }
}

/**
 * Batch process embeddings with rate limiting
 * @param {Array} items - Items to process
 * @param {Function} processFunction - Function to process each item
 * @param {Object} options - Processing options
 * @returns {Array} - Processed results
 */
async function batchProcessEmbeddings(items, processFunction, options = {}) {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000, // ms
    maxRetries = 3,
    retryDelay = 2000 // ms
  } = options;

  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = [];

    logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);

    for (const item of batch) {
      let retries = 0;
      let success = false;

      while (retries <= maxRetries && !success) {
        try {
          const result = await processFunction(item);
          batchResults.push(result);
          success = true;
        } catch (error) {
          retries++;
          
          if (retries <= maxRetries) {
            logger.warn(`Processing failed, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            logger.error(`Failed to process item after ${maxRetries} retries:`, error);
            errors.push({ item, error: error.message });
          }
        }
      }
    }

    results.push(...batchResults);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return { results, errors };
}

/**
 * Calculate embedding statistics
 * @param {Array<Array<number>>} embeddings - Array of embeddings
 * @returns {Object} - Statistics object
 */
function calculateEmbeddingStats(embeddings) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    return {
      count: 0,
      dimension: 0,
      mean: [],
      variance: [],
      standardDeviation: [],
      centroid: []
    };
  }

  const dimension = embeddings[0].length;
  const count = embeddings.length;

  // Calculate mean for each dimension
  const mean = new Array(dimension).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      mean[i] += embedding[i];
    }
  }
  mean.forEach((sum, i) => { mean[i] = sum / count; });

  // Calculate variance and standard deviation
  const variance = new Array(dimension).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      const diff = embedding[i] - mean[i];
      variance[i] += diff * diff;
    }
  }
  variance.forEach((sum, i) => { variance[i] = sum / count; });

  const standardDeviation = variance.map(v => Math.sqrt(v));

  return {
    count,
    dimension,
    mean,
    variance,
    standardDeviation,
    centroid: mean, // Centroid is same as mean for this context
    totalMagnitude: Math.sqrt(mean.reduce((sum, val) => sum + val * val, 0))
  };
}

/**
 * Cluster embeddings using k-means
 * @param {Array<Array<number>>} embeddings - Array of embeddings
 * @param {number} k - Number of clusters
 * @param {number} maxIterations - Maximum iterations
 * @returns {Object} - Clustering results
 */
function kMeansCluster(embeddings, k = 3, maxIterations = 100) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error('Embeddings array cannot be empty');
  }

  if (k <= 0 || k > embeddings.length) {
    throw new Error('K must be between 1 and number of embeddings');
  }

  const dimension = embeddings[0].length;
  
  // Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * embeddings.length);
    centroids.push([...embeddings[randomIndex]]);
  }

  let assignments = new Array(embeddings.length);
  let iteration = 0;
  let converged = false;

  while (iteration < maxIterations && !converged) {
    // Assign each point to nearest centroid
    const newAssignments = embeddings.map((embedding, index) => {
      let minDistance = Infinity;
      let assignment = 0;

      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(embedding, centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          assignment = j;
        }
      }

      return assignment;
    });

    // Check for convergence
    converged = JSON.stringify(assignments) === JSON.stringify(newAssignments);
    assignments = newAssignments;

    // Update centroids
    if (!converged) {
      const newCentroids = new Array(k).fill().map(() => new Array(dimension).fill(0));
      const counts = new Array(k).fill(0);

      embeddings.forEach((embedding, index) => {
        const cluster = assignments[index];
        counts[cluster]++;
        for (let dim = 0; dim < dimension; dim++) {
          newCentroids[cluster][dim] += embedding[dim];
        }
      });

      // Calculate new centroids
      for (let j = 0; j < k; j++) {
        if (counts[j] > 0) {
          for (let dim = 0; dim < dimension; dim++) {
            newCentroids[j][dim] /= counts[j];
          }
          centroids[j] = newCentroids[j];
        }
      }
    }

    iteration++;
  }

  // Calculate cluster statistics
  const clusters = new Array(k).fill().map(() => []);
  embeddings.forEach((embedding, index) => {
    clusters[assignments[index]].push({ index, embedding });
  });

  return {
    centroids,
    assignments,
    clusters,
    iterations: iteration,
    converged,
    k
  };
}

module.exports = {
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  calculateCentroid,
  findSimilarVectors,
  validateEmbedding,
  embeddingToString,
  stringToEmbedding,
  batchProcessEmbeddings,
  calculateEmbeddingStats,
  kMeansCluster
};