/**
 * AI Context Routes
 * Handles .aicontext folder and folder-context.md file management
 *
 * @deprecated This file is deprecated as of 2025-10-09.
 * The AI context functionality now uses existing document and navigation APIs:
 * - List context files: GET /applications/wiki/api/spaces/:spaceId/folders (filter for .aicontext)
 * - Read context: GET /applications/wiki/api/documents/content?path=...&spaceName=...
 * - Save context: PUT /applications/wiki/api/documents/content + POST /applications/wiki/api/folders
 *
 * Note: Context files are now named 'folder-context.md' instead of 'context.md'
 *
 * This file is kept for reference but is no longer registered in routes/index.js
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-08
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { ensureAuthenticated } = require('../auth/middleware');

/**
 * Get all .aicontext folders and their context.md files in a space
 */
router.get('/list', ensureAuthenticated, async (req, res) => {
    try {
        const { spaceName } = req.query;

        if (!spaceName) {
            return res.status(400).json({ error: 'Space name is required' });
        }

        // Get space path from dataManager
        const dataManager = req.app.get('dataManager');
        const spaces = await dataManager.getSpaces(req.user.id);
        const space = spaces.find(s => s.name === spaceName);

        if (!space) {
            return res.status(404).json({ error: 'Space not found' });
        }

        const spacePath = path.resolve(space.path);
        const contextFiles = [];

        // Recursively find all .aicontext folders
        async function findAiContextFolders(dir, relativePath = '') {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relPath = path.join(relativePath, entry.name);

                    if (entry.isDirectory()) {
                        if (entry.name === '.aicontext') {
                            // Check if context.md exists
                            const contextMdPath = path.join(fullPath, 'context.md');
                            try {
                                await fs.access(contextMdPath);
                                contextFiles.push({
                                    folder: relativePath || '/',
                                    contextPath: relPath,
                                    contextFile: path.join(relPath, 'context.md'),
                                    exists: true
                                });
                            } catch {
                                contextFiles.push({
                                    folder: relativePath || '/',
                                    contextPath: relPath,
                                    contextFile: path.join(relPath, 'context.md'),
                                    exists: false
                                });
                            }
                        } else {
                            // Recursively search subdirectories (skip hidden folders except .aicontext)
                            if (!entry.name.startsWith('.')) {
                                await findAiContextFolders(fullPath, relPath);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${dir}:`, error);
            }
        }

        await findAiContextFolders(spacePath);

        res.json({ contextFiles });
    } catch (error) {
        console.error('Error listing AI context files:', error);
        res.status(500).json({ error: 'Failed to list AI context files' });
    }
});

/**
 * Get content of a context.md file
 */
router.get('/content', ensureAuthenticated, async (req, res) => {
    try {
        const { spaceName, contextPath } = req.query;

        if (!spaceName || !contextPath) {
            return res.status(400).json({ error: 'Space name and context path are required' });
        }

        // Get space path from dataManager
        const dataManager = req.app.get('dataManager');
        const spaces = await dataManager.getSpaces(req.user.id);
        const space = spaces.find(s => s.name === spaceName);

        if (!space) {
            return res.status(404).json({ error: 'Space not found' });
        }

        const spacePath = path.resolve(space.path);
        const fullContextPath = path.join(spacePath, contextPath);

        // Security check: ensure path is within space
        if (!fullContextPath.startsWith(spacePath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const content = await fs.readFile(fullContextPath, 'utf-8');
        res.json({ content });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Context file not found' });
        } else {
            console.error('Error reading context file:', error);
            res.status(500).json({ error: 'Failed to read context file' });
        }
    }
});

/**
 * Create or update a context.md file
 */
router.post('/save', ensureAuthenticated, async (req, res) => {
    try {
        const { spaceName, folderPath, content } = req.body;

        if (!spaceName || folderPath === undefined) {
            return res.status(400).json({ error: 'Space name and folder path are required' });
        }

        // Get space path from dataManager
        const dataManager = req.app.get('dataManager');
        const spaces = await dataManager.getSpaces(req.user.id);
        const space = spaces.find(s => s.name === spaceName);

        if (!space) {
            return res.status(404).json({ error: 'Space not found' });
        }

        const spacePath = path.resolve(space.path);
        const targetFolder = folderPath ? path.join(spacePath, folderPath) : spacePath;

        // Security check: ensure path is within space
        if (!targetFolder.startsWith(spacePath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Create .aicontext folder if it doesn't exist
        const aiContextFolder = path.join(targetFolder, '.aicontext');
        await fs.mkdir(aiContextFolder, { recursive: true });

        // Write context.md file
        const contextFilePath = path.join(aiContextFolder, 'context.md');
        await fs.writeFile(contextFilePath, content || '', 'utf-8');

        res.json({
            success: true,
            contextPath: path.relative(spacePath, contextFilePath)
        });
    } catch (error) {
        console.error('Error saving context file:', error);
        res.status(500).json({ error: 'Failed to save context file' });
    }
});

/**
 * Delete a .aicontext folder
 */
router.delete('/delete', ensureAuthenticated, async (req, res) => {
    try {
        const { spaceName, contextPath } = req.body;

        if (!spaceName || !contextPath) {
            return res.status(400).json({ error: 'Space name and context path are required' });
        }

        // Get space path from dataManager
        const dataManager = req.app.get('dataManager');
        const spaces = await dataManager.getSpaces(req.user.id);
        const space = spaces.find(s => s.name === spaceName);

        if (!space) {
            return res.status(404).json({ error: 'Space not found' });
        }

        const spacePath = path.resolve(space.path);
        const fullContextPath = path.join(spacePath, contextPath);

        // Security check: ensure path is within space and is .aicontext folder
        if (!fullContextPath.startsWith(spacePath) || !contextPath.includes('.aicontext')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete the .aicontext folder
        await fs.rm(fullContextPath, { recursive: true, force: true });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting context folder:', error);
        res.status(500).json({ error: 'Failed to delete context folder' });
    }
});

module.exports = router;
