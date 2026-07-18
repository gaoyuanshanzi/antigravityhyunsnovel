// importer.js — Parse HTML files exported by this service back into project data

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Parse HTML string to extract structured sections, chapters and rich text contents
export const importFromHtml = (htmlString, overrideTitle) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract title
  const titleEl = doc.querySelector('h1.book-title');
  const title = overrideTitle || titleEl?.textContent?.trim() || '가져온 소설';

  // Get the main content container
  const contentBody = doc.querySelector('.content-body') || doc.body;
  const children = Array.from(contentBody.children);

  const sections = [];
  let currentSection = null;
  let currentChapter = null;

  children.forEach((node) => {
    // 1. Check for Section Headings
    if (node.matches('h2.section-heading')) {
      const secTitle = node.textContent.trim().replace(/^Section\s+\d+[.\s]*/i, '').trim();
      currentSection = {
        id: genId(),
        title: secTitle,
        chapters: []
      };
      sections.push(currentSection);
      currentChapter = null; // Reset current chapter for the new section
    } 
    // 2. Check for Chapter Headings
    else if (node.matches('h3.chapter-heading')) {
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
    // 3. Check for Paragraph blocks (novel content)
    else if (node.matches('p.content-block') || node.matches('p.content-paragraph') || node.tagName === 'P') {
      if (currentChapter) {
        const paragraphHtml = node.innerHTML;
        if (currentChapter.content) {
          currentChapter.content += '<br>' + paragraphHtml;
        } else {
          currentChapter.content = paragraphHtml;
        }
      }
    }
  });

  return { title, sections };
};
