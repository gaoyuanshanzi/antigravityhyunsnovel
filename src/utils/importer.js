// importer.js — Parse HTML files exported by this service back into project data

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Parse HTML string to extract structured sections, chapters and rich text contents
export const importFromHtml = (htmlString, overrideTitle) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract title
  const titleEl = doc.querySelector('h1.book-title') || doc.querySelector('h1');
  const title = overrideTitle || titleEl?.textContent?.trim() || '가져온 소설';

  // Get the main content container
  const contentBody = doc.querySelector('.content-body') || doc.body;
  const children = Array.from(contentBody.children);

  const sections = [];
  let currentSection = null;
  let currentChapter = null;

  children.forEach((node) => {
    const tagName = node.tagName.toUpperCase();

    // 1. Check for Section Headings (H2)
    if (tagName === 'H2') {
      const secTitle = node.textContent.trim().replace(/^Section\s+\d+[.\s]*/i, '').trim();
      currentSection = {
        id: genId(),
        title: secTitle,
        chapters: []
      };
      sections.push(currentSection);
      currentChapter = null; // Reset current chapter for the new section
    } 
    // 2. Check for Chapter Headings (H3)
    else if (tagName === 'H3') {
      // Safety fallback: if chapter is found before any section
      if (!currentSection) {
        currentSection = {
          id: genId(),
          title: '섹션 1',
          chapters: []
        };
        sections.push(currentSection);
      }
      
      const chTitle = node.textContent.trim().replace(/^Chapter\s+\d+[.\s]*/i, '').trim();
      currentChapter = {
        id: genId(),
        title: chTitle,
        content: ''
      };
      currentSection.chapters.push(currentChapter);
    } 
    // 3. Check for Chapter content blocks (All sibling nodes that are not headings/TOC/styles)
    else if (
      tagName !== 'H1' && 
      tagName !== 'STYLE' && 
      tagName !== 'SCRIPT' && 
      tagName !== 'NAV' &&
      !node.classList.contains('toc')
    ) {
      if (currentChapter) {
        const paragraphHtml = node.innerHTML;
        
        // If it's the new single-block format, override directly
        if (node.classList.contains('chapter-content-block')) {
          currentChapter.content = paragraphHtml;
        } 
        // If it's the legacy paragraph/div format, accumulate with line breaks
        else {
          if (currentChapter.content) {
            currentChapter.content += '<br>' + paragraphHtml;
          } else {
            currentChapter.content = paragraphHtml;
          }
        }
      }
    }
  });

  return { title, sections };
};
