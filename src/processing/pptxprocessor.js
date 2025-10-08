/**
 * @fileoverview PPTX to Markdown converter
 * Converts Microsoft PowerPoint presentations to markdown format
 *
 * @author NooblyJS Team
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const PPTXParser = require('pptx-parser');

async function convertToMarkdown(pptxFilePath, outputMdPath) {
  try {
    const parser = new PPTXParser();
    const presentation = await parser.parse(pptxFilePath);
    
    let markdown = `# ${presentation.title || 'Presentation'}\n\n`;
    
    presentation.slides.forEach((slide, index) => {
      markdown += `## Slide ${index + 1}\n\n`;
      
      slide.texts.forEach(text => {
        markdown += `${text}\n\n`;
      });
    });
    
    fs.writeFileSync(outputMdPath, markdown, 'utf8');
    console.log('Conversion successful!');
    
    return markdown;
  } catch (error) {
    console.error('Error:', error);
    throw error;
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
