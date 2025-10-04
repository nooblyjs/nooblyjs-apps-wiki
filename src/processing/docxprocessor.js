/**
 * @fileoverview DOCX to Markdown converter
 * Converts Microsoft Word documents to markdown format
 *
 * @author NooblyJS Team
 * @version 1.0.0
 */

'use strict';

const mammoth = require('mammoth');
const path = require('path');

/**
 * Convert a DOCX file to markdown
 * @param {string} filePath - Absolute path to the DOCX file
 * @returns {Promise<string>} Markdown content
 */
async function convertToMarkdown(filePath) {
    try {
        const result = await mammoth.convertToMarkdown({ path: filePath });

        if (result.messages && result.messages.length > 0) {
            console.warn('DOCX conversion warnings:', result.messages);
        }

        return result.value;
    } catch (error) {
        throw new Error(`Failed to convert DOCX to markdown: ${error.message}`);
    }
}

/**
 * Check if a file is a DOCX file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file is DOCX
 */
function isDocxFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.docx';
}

module.exports = {
    convertToMarkdown,
    isDocxFile
};
