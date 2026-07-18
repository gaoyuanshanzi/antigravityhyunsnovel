// importer.js — Parse HTML files exported by this service back into project data

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Parse HTML string to extract structured sections, chapters and rich text contents
export const importFromHtml = (htmlString, overrideTitle) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract book title
  const titleEl = doc.querySelector('h1.book-title') || doc.querySelector('h1');
  const title = overrideTitle || titleEl?.textContent?.trim() || '가져온 소설';

  // Gather all h2 and h3 elements across the document.
  // Exclude headings nested inside TOC (table of contents) container.
  const headingElements = Array.from(doc.querySelectorAll('h2, h3')).filter((el) => {
    return !el.closest('.toc') && !el.closest('nav');
  });

  const sections = [];
  let currentSection = null;
  let currentChapter = null;

  headingElements.forEach((heading, idx) => {
    const tagName = heading.tagName.toUpperCase();

    // 1. Handle Section Heading (H2)
    if (tagName === 'H2') {
      const secTitle = heading.textContent.trim().replace(/^Section\s+\d+[.\s]*/i, '').trim();
      currentSection = {
        id: genId(),
        title: secTitle,
        chapters: []
      };
      sections.push(currentSection);
      currentChapter = null; // reset active chapter context for the new section
    } 
    // 2. Handle Chapter Heading (H3)
    else if (tagName === 'H3') {
      // Fallback in case of loose chapters before any section is defined
      if (!currentSection) {
        currentSection = {
          id: genId(),
          title: '섹션 1',
          chapters: []
        };
        sections.push(currentSection);
      }

      const chTitle = heading.textContent.trim().replace(/^Chapter\s+\d+[.\s]*/i, '').trim();
      currentChapter = {
        id: genId(),
        title: chTitle,
        content: ''
      };
      currentSection.chapters.push(currentChapter);

      // Traversal: Collect all sibling elements between this chapter heading and the next heading element
      const collectedContent = [];
      const nextHeading = headingElements[idx + 1];
      let sibling = heading.nextSibling;

      while (sibling && sibling !== nextHeading) {
        // Robust escape check: If the sibling element contains or matches any heading, break immediately.
        // This handles cases where legacy HTML parsing auto-closes nested tags and restructures headings as children of subsequent blocks.
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const siblingTagName = sibling.tagName.toUpperCase();
          
          if (siblingTagName === 'H2' || siblingTagName === 'H3') {
            break;
          }

          // Check if any heading in the document is nested within this sibling
          const hasNestedHeading = headingElements.some(h => 
            h === sibling || (sibling.contains && sibling.contains(h))
          );
          if (hasNestedHeading) {
            break;
          }
          
          // Filter out layout wrappers or script injections
          if (siblingTagName !== 'STYLE' && siblingTagName !== 'SCRIPT' && siblingTagName !== 'NAV') {
            // New design uses a wrapper container, extract its clean interior directly
            if (sibling.classList.contains('chapter-content-block')) {
              collectedContent.push(sibling.innerHTML);
            } 
            // Legacy formats append the entire element representation
            else {
              collectedContent.push(sibling.outerHTML || sibling.innerHTML);
            }
          }
        } 
        // Text nodes directly under the body
        else if (sibling.nodeType === Node.TEXT_NODE) {
          const text = sibling.textContent.trim();
          if (text) {
            collectedContent.push(text);
          }
        }
        sibling = sibling.nextSibling;
      }

      currentChapter.content = collectedContent.join('<br>').trim();
    }
  });

  return { title, sections };
};
