/**
 * @fileoverview PPTX to Markdown converter
 * Converts Microsoft PowerPoint presentations to markdown format
 *
 * @author NooblyJS Team
 * @version 1.0.0
 */

'use strict';

const pptx2json = require('pptx2json');
const path = require('path');

/**
 * Convert a PPTX file to markdown
 * @param {string} filePath - Absolute path to the PPTX file
 * @returns {Promise<string>} Markdown content
 */
async function convertToMarkdown(filePath) {
    try {
        const result = await pptx2json(filePath);
        let markdown = '';

        // Add presentation title
        markdown += `# PowerPoint Presentation\n\n`;

        // Process each slide
        result.slides.forEach((slide, index) => {
            markdown += `## Slide ${index + 1}\n\n`;

            // Extract text content from the slide
            if (slide.content && Array.isArray(slide.content)) {
                slide.content.forEach(item => {
                    if (item.text) {
                        // Determine heading level based on text properties
                        const text = item.text.trim();
                        if (text) {
                            // Simple heuristic: if text is short and at the top, make it a heading
                            if (item.level === 0 || (text.length < 50 && index === 0)) {
                                markdown += `### ${text}\n\n`;
                            } else {
                                markdown += `${text}\n\n`;
                            }
                        }
                    }
                });
            } else if (typeof slide === 'string') {
                markdown += `${slide}\n\n`;
            }

            // Add separator between slides
            markdown += '---\n\n';
        });

        return markdown;
    } catch (error) {
        // Fallback: If pptx2json fails, provide a basic markdown structure
        console.warn(`pptx2json conversion failed: ${error.message}, using fallback`);
        return `# PowerPoint Presentation\n\n` +
               `*Note: This presentation could not be fully converted to markdown.*\n\n` +
               `The file ${path.basename(filePath)} is a PowerPoint presentation. ` +
               `To view the full content, please download and open it in Microsoft PowerPoint or a compatible application.\n`;
    }
}

/**
 * Check if a file is a PPTX file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file is PPTX
 */
function isPptxFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pptx' || ext === '.ppt';
}

module.exports = {
    convertToMarkdown,
    isPptxFile
};
