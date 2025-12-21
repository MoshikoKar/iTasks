// Export utilities for reports

export interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Filter out emojis and unsupported characters for PDF export
 * Only allows ASCII printable characters (32-126) plus common extended ASCII (128-255)
 * This ensures compatibility with jsPDF and standard PDF fonts
 */
function filterSupportedCharacters(text: string): string {
  return text
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Allow ASCII printable (32-126) and extended ASCII (128-255)
      // Also allow common whitespace characters (tab, newline, etc.)
      return (code >= 32 && code <= 126) || (code >= 128 && code <= 255) || code === 9 || code === 10 || code === 13;
    })
    .join('');
}

export interface ReportSection {
  title: string;
  data: ExportData[];
  headers?: string[];
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: ExportData[], headers?: string[]): string {
  if (data.length === 0) return '';

  // If headers not provided, use keys from first data object
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.join(',');

  // Create data rows
  const dataRows = data.map(row =>
    csvHeaders.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: ExportData[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download multiple report sections as CSV with sections separated
 */
export function downloadMultiSectionCSV(sections: ReportSection[], filename: string): void {
  let csvContent = '';

  sections.forEach((section, index) => {
    if (index > 0) csvContent += '\n\n'; // Add spacing between sections

    csvContent += `${section.title}\n`;
    csvContent += convertToCSV(section.data, section.headers);
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF from HTML element
 */
export async function exportToPDF(elementId: string, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Fetch system configuration for branding
    const systemConfig = await fetchSystemConfig();

    // Generate timestamp once for use in footer
    const now = new Date();
    const timestamp = `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    const headerY = margin;

    // Add organization logo on the left
    let leftLogoHeight = 0;
    if (systemConfig.orgLogo) {
      try {
        const logoData = await loadImageAsBase64(systemConfig.orgLogo);
        if (logoData) {
          const logoMaxHeight = 12;
          const logoMaxWidth = 35;
          const imgProps = pdf.getImageProperties(logoData);
          const logoRatio = Math.min(logoMaxWidth / imgProps.width, logoMaxHeight / imgProps.height);
          const logoWidth = imgProps.width * logoRatio;
          const logoHeight = imgProps.height * logoRatio;

          pdf.addImage(logoData, 'JPEG', margin, headerY, logoWidth, logoHeight);
          leftLogoHeight = logoHeight;
        }
      } catch (logoError) {
        console.warn('Failed to load organization logo for PDF:', logoError);
      }
    }

    // Add iTasks logo on the right
    let rightLogoHeight = 0;
    try {
      const iTasksLogoPath = '/itasks_logo.png';
      const iTasksLogoData = await loadImageAsBase64(iTasksLogoPath);
      if (iTasksLogoData) {
        const logoMaxHeight = 12;
        const logoMaxWidth = 35;
        const imgProps = pdf.getImageProperties(iTasksLogoData);
        const logoRatio = Math.min(logoMaxWidth / imgProps.width, logoMaxHeight / imgProps.height);
        const logoWidth = imgProps.width * logoRatio;
        const logoHeight = imgProps.height * logoRatio;

        const rightLogoX = pageWidth - margin - logoWidth;
        pdf.addImage(iTasksLogoData, 'PNG', rightLogoX, headerY, logoWidth, logoHeight);
        rightLogoHeight = logoHeight;
      }
    } catch (logoError) {
      console.warn('Failed to load iTasks logo for PDF:', logoError);
      // Fallback to text if image fails
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const iTasksText = 'iTasks';
      const iTasksTextWidth = pdf.getTextWidth(iTasksText);
      const rightLogoX = pageWidth - margin - iTasksTextWidth;
      pdf.text(iTasksText, rightLogoX, headerY + 8);
      rightLogoHeight = 10;
    }

    // Set yPosition to the maximum height of either logo
    yPosition = headerY + Math.max(leftLogoHeight, rightLogoHeight) + 5;

    // Add report title (centered)
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const title = 'iTasks Report';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 6;

    // Add separator line
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Extract and format text content
    const textContent = extractTextContent(element);
    const lines = textContent.split('\n').filter(line => line.trim());

    // Content formatting
    let currentY = yPosition;
    const lineHeight = 5;
    const headerLineHeight = 6;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Determine footer text (use default if not configured)
    const defaultFooterText = 'Made with <3 with iTasks';
    let footerText = defaultFooterText;
    if (systemConfig.reportFooterText && systemConfig.reportFooterText.trim()) {
      // Filter out any emojis/unsupported chars from existing value
      footerText = filterSupportedCharacters(systemConfig.reportFooterText.trim()) || defaultFooterText;
    }

    for (const line of lines) {
      // Check if we need a new page (leave room for footer)
      const footerHeight = 20;
      if (currentY > pageHeight - margin - footerHeight - 10) {
        addFooter(pdf, footerText, timestamp, pageWidth, pageHeight, margin);
        pdf.addPage();
        currentY = margin + 5;

        // Re-add header on new page
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('iTasks Report (continued)', margin, currentY);
        currentY += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
      }

      // Handle headers (lines starting with =)
      if (line.startsWith('===')) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        const headerText = line.replace(/^=+\s*/, '');
        pdf.text(headerText, margin, currentY);
        currentY += headerLineHeight + 2;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
      } else if (line.startsWith('==')) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        const headerText = line.replace(/^=+\s*/, '');
        pdf.text(headerText, margin, currentY);
        currentY += headerLineHeight + 1;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
      } else if (line.startsWith('=')) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        const headerText = line.replace(/^=+\s*/, '');
        pdf.text(headerText, margin, currentY);
        currentY += headerLineHeight;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
      } else {
        // Regular text - wrap long lines
        const wrappedLines = pdf.splitTextToSize(line, contentWidth);
        wrappedLines.forEach((wrappedLine: string) => {
          pdf.text(wrappedLine, margin, currentY);
          currentY += lineHeight;
        });
        currentY += 1; // Extra space between paragraphs
      }
    }

    // Add footer to the last page
    addFooter(pdf, footerText, timestamp, pageWidth, pageHeight, margin);

    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('PDF export failed. Please try again or contact support.');
  }
}

/**
 * Fetch system configuration for branding
 */
async function fetchSystemConfig(): Promise<{ orgLogo: string | null; reportFooterText: string | null }> {
  try {
    const response = await fetch('/api/system-config');
    if (!response.ok) {
      console.warn('Failed to fetch system config, using defaults');
      return { orgLogo: null, reportFooterText: null };
    }
    const config = await response.json();
    return {
      orgLogo: config.orgLogo || null,
      reportFooterText: config.reportFooterText || null,
    };
  } catch (error) {
    console.warn('Error fetching system config:', error);
    return { orgLogo: null, reportFooterText: null };
  }
}

/**
 * Load image as base64 for PDF embedding
 */
async function loadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    // Handle blob URLs (from file uploads)
    if (imageUrl.startsWith('blob:')) {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    // Handle relative URLs (uploaded logos)
    if (imageUrl.startsWith('/')) {
      imageUrl = window.location.origin + imageUrl;
    }

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image:', error);
    return null;
  }
}

/**
 * Add footer to PDF page
 */
function addFooter(pdf: any, footerText: string, timestamp: string, pageWidth: number, pageHeight: number, margin: number): void {
  const footerY = pageHeight - margin + 2;
  const footerLineY = footerY - 5;

  // Add footer line
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerLineY, pageWidth - margin, footerLineY);

  // Add timestamp on the left
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(timestamp, margin, footerY);

  // Add footer text in the center
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  // jsPDF's text() method supports Unicode, but emoji rendering depends on the PDF viewer
  // The emoji may display as a box or not render in some viewers
  const footerTextWidth = pdf.getTextWidth(footerText);
  pdf.text(footerText, (pageWidth - footerTextWidth) / 2, footerY);

  // Add page number on the right
  const pageNumber = pdf.getNumberOfPages();
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const pageText = `Page ${pageNumber}`;
  const pageTextWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, pageWidth - margin - pageTextWidth, footerY);
}

/**
 * Extract readable text content from an HTML element
 */
function extractTextContent(element: HTMLElement): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove elements that shouldn't be in the PDF
  const elementsToRemove = clone.querySelectorAll('button, input, select, textarea, .hidden, [style*="display: none"], [style*="visibility: hidden"]');
  elementsToRemove.forEach(el => el.remove());

  // Extract text while preserving some structure
  let text = '';

  function processNode(node: Node, depth = 0): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent?.trim();
      if (textContent) {
        text += textContent + ' ';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Add line breaks for block elements
      if (['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tagName)) {
        if (text && !text.endsWith('\n\n')) {
          text += '\n';
        }
      }

      // Add headers with emphasis
      if (tagName.startsWith('h') && tagName.length === 2) {
        const level = parseInt(tagName.charAt(1));
        text += '='.repeat(level) + ' ';
      }

      // Process children
      for (const child of Array.from(element.childNodes)) {
        processNode(child, depth + 1);
      }

      // Add spacing after certain elements
      if (['div', 'p', 'li', 'tr'].includes(tagName)) {
        text += '\n';
      }
    }
  }

  processNode(clone);

  // Clean up the text
  return text
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .trim();
}

/**
 * Format date for export filenames
 */
export function getFormattedDateForFilename(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Generate report filename with timestamp
 */
export function generateReportFilename(baseName: string, extension: string): string {
  const date = getFormattedDateForFilename();
  return `${baseName}_${date}.${extension}`;
}

/**
 * Format date range for display
 */
export function formatDateRange(start?: Date, end?: Date): string {
  if (!start && !end) return 'All time';
  if (start && end) {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
  if (start) return `From ${start.toLocaleDateString()}`;
  if (end) return `Until ${end.toLocaleDateString()}`;
  return 'All time';
}