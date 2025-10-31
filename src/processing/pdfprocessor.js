/**
 * @fileoverview PDF File Processor
 * Converts PDF files to markdown format for document management
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-08-24
 */

'use strict';

const fs = require('fs').promises;
const pdf = require('pdf-parse');

/**
 * Converts a PDF file to markdown format
 * @async
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<string>} Markdown formatted content
 * @throws {Error} If PDF processing or file operations fail
 */
async function convertToMarkdown(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    let markdown = data.text;

    // Enhanced formatting
    markdown = markdown
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      // Try to detect headings (lines in all caps or with specific patterns)
      .replace(/^([A-Z][A-Z\s]{3,})$/gm, '## $1')
      // Add list formatting for lines starting with bullets or numbers
      .replace(/^[•●○]\s+/gm, '- ')
      .replace(/^\d+\.\s+/gm, (match) => match)
      .trim();

    // Add metadata
    const title = filePath.split('/').pop().replace('.pdf', '');
    const header = `# ${title}\n\n---\n\n`;
    markdown = header + markdown;

    const outputPath = filePath.replace('.pdf', '.md');
    await fs.writeFile(outputPath, markdown);

    return markdown;

  } catch (error) {
    throw error;
  }
}

/**
 * Checks if a file is a PDF file by extension
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file has .pdf extension
 */
function isPDFFile(filePath) {
  const path = require('path');
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.pdf';
}

module.exports = {
    convertToMarkdown,
    isPDFFile
};