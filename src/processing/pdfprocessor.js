const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * Convert a DOCX file to markdown
 * @param {string} filePath - Absolute path to the DOCX file
 * @returns {Promise<string>} Markdown content
 */
async function convertToMarkdown(filePath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
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
    const title = pdfPath.split('/').pop().replace('.pdf', '');
    const header = `# ${title}\n\n` +
                   `**Pages:** ${data.numpages}\n\n` +
                   `---\n\n`;
    
    markdown = header + markdown;
    
    fs.writeFileSync(outputPath, markdown);
    
    console.log(`✓ Successfully converted PDF to Markdown`);
    console.log(`  Input: ${pdfPath}`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  Pages: ${data.numpages}`);
    
    return markdown;
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Check if a file is a PDF file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file is PDF
 */
function isPDFFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pdf';
}

module.exports = {
    convertToMarkdown,
    isPDFFile
};


// Usage
pdfToMarkdown('./document.pdf', './document.md');