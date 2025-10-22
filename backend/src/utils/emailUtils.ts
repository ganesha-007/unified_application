/**
 * Clean email body content by removing MIME headers, boundaries, and unwanted content
 */
export const cleanEmailBody = (body: string): string => {
  if (!body) return '';
  
  let cleaned = body;
  
  // Remove MIME headers and boundaries
  cleaned = cleaned.replace(/MIME-Version:.*?\n/gi, '');
  cleaned = cleaned.replace(/Content-Type:.*?\n/gi, '');
  cleaned = cleaned.replace(/Content-Transfer-Encoding:.*?\n/gi, '');
  cleaned = cleaned.replace(/Content-Disposition:.*?\n/gi, '');
  cleaned = cleaned.replace(/--[a-zA-Z0-9_-]+/g, '');
  
  // Remove base64 encoded content (long strings of base64)
  cleaned = cleaned.replace(/[A-Za-z0-9+/]{100,}/g, '');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove extra whitespace and newlines
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');
  
  return cleaned;
};

/**
 * Convert HTML content to plain text
 */
export const convertHtmlToText = (html: string): string => {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};
