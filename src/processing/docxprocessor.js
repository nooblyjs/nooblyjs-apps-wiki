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
 * @async
 * @param {string} filePath - Absolute path to the DOCX file
 * @returns {Promise<string>} Markdown formatted content
 * @throws {Error} If DOCX processing fails
 */
async function convertToMarkdown(filePath) {
  try {
    const result = await mammoth.convertToMarkdown({ path: filePath });

    // Warning messages are available in result.messages if needed
    // but are not logged to console for cleaner operation

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
