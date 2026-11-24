/**
 * Secure In-Memory Document Parser (PDF, TXT, MD, CSV, JSON, Source Code)
 */
export class DocumentParser {
  static async parse(file) {
    if (!file || !file.buffer) {
      throw new Error('No file buffer provided for parsing.');
    }

    const filename = file.originalname.toLowerCase();
    const mimeType = file.mimetype;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File exceeds the 10MB size limit.');
    }

    // Text-based files (txt, md, json, csv, js, ts, py, html, css, etc.)
    const textExtensions = [
      '.txt', '.md', '.markdown', '.json', '.csv', '.js', '.ts', '.py',
      '.html', '.css', '.scss', '.sql', '.yaml', '.yml', '.xml', '.sh'
    ];

    const isTextFile = textExtensions.some(ext => filename.endsWith(ext)) ||
                       mimeType.startsWith('text/') ||
                       mimeType === 'application/json';

    if (isTextFile) {
      const text = file.buffer.toString('utf-8');
      return {
        filename: file.originalname,
        type: mimeType,
        size: file.size,
        text: text.slice(0, 100000) // Truncate to first 100k chars for prompt safety
      };
    }

    // PDF files
    if (filename.endsWith('.pdf') || mimeType === 'application/pdf') {
      try {
        // Simple extraction of printable text streams from PDF buffer without heavy C++ binary dependencies
        const rawContent = file.buffer.toString('latin1');
        const textMatches = rawContent.match(/\((.*?)\)\s*Tj/g) || [];
        let extracted = textMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');

        if (!extracted || extracted.length < 50) {
          extracted = `[PDF Document: ${file.originalname} - ${Math.round(file.size / 1024)} KB content attached]`;
        }

        return {
          filename: file.originalname,
          type: 'application/pdf',
          size: file.size,
          text: extracted.slice(0, 50000)
        };
      } catch (err) {
        return {
          filename: file.originalname,
          type: 'application/pdf',
          size: file.size,
          text: `[PDF: ${file.originalname} attached]`
        };
      }
    }

    throw new Error(`Unsupported document format for "${file.originalname}". Allowed: PDF, TXT, MD, CSV, JSON, Code.`);
  }
}
