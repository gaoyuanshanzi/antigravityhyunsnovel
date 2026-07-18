// importer.js — Parse TXT and HTML files exported by this service back into project data

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ─────────────────────────────────────────────
// Import from HTML file exported by this service
// ─────────────────────────────────────────────
export const importFromHtml = (htmlString, overrideTitle) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract title
  const titleEl = doc.querySelector('h1.book-title');
  const title = overrideTitle || titleEl?.textContent?.trim() || '가져온 소설';

  // Find all section headings in document order
  const contentBody = doc.querySelector('.content-body') || doc.body;
  const allSectionEls = contentBody.querySelectorAll('h2.section-heading');

  const sections = [];

  allSectionEls.forEach((secEl) => {
    let secTitle = secEl.textContent.trim().replace(/^Section\s+\d+[.\s]*/i, '').trim();

    const chapters = [];
    let node = secEl.nextElementSibling;

    while (node && !node.matches('h2.section-heading')) {
      if (node.matches('h3.chapter-heading')) {
        let chTitle = node.textContent.trim().replace(/^Chapter\s+\d+[.\s]*/i, '').trim();

        // Collect paragraph content until next heading
        const contentParts = [];
        let contentNode = node.nextElementSibling;
        while (contentNode && !contentNode.matches('h2.section-heading, h3.chapter-heading')) {
          if (contentNode.matches('p.content-block') || contentNode.tagName === 'P') {
            contentParts.push(contentNode.innerHTML);
          }
          contentNode = contentNode.nextElementSibling;
        }

        chapters.push({
          id: genId(),
          title: chTitle,
          content: contentParts.join('<br>')
        });
      }
      node = node.nextElementSibling;
    }

    sections.push({ id: genId(), title: secTitle, chapters });
  });

  return { title, sections };
};

// ─────────────────────────────────────────────
// Import from TXT file exported by this service
// ─────────────────────────────────────────────
export const importFromTxt = (txtString, overrideTitle) => {
  const rawLines = txtString.split('\n');

  // Auto-detect title from first non-empty line
  let autoTitle = '';
  for (const l of rawLines) {
    if (l.trim()) { autoTitle = l.trim(); break; }
  }
  const title = overrideTitle || autoTitle || '가져온 소설';

  const SECTION_RE = /^Section\s+(\d+)[.\s]+(.*)$/i;
  const CHAPTER_RE = /^Chapter\s+(\d+)[.\s]+(.*)$/i;
  const DIVIDER_RE = /^[=\-]{5,}$/;
  const TOC_RE     = /^={10,}/;

  const sections = [];
  let currentSection = null;
  let currentChapter = null;
  let contentLines = [];
  let inTOC = false;
  let tocPassed = false;

  const flushChapter = () => {
    if (currentChapter) {
      currentChapter.content = contentLines.join('\n').trim();
      contentLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Skip the TOC block (between two ======= lines)
    if (TOC_RE.test(trimmed)) {
      if (!tocPassed) {
        inTOC = !inTOC;
        if (!inTOC) tocPassed = true;
      }
      continue;
    }
    if (inTOC) continue;

    // Section header
    const secMatch = trimmed.match(SECTION_RE);
    if (secMatch) {
      flushChapter();
      if (currentSection) sections.push(currentSection);
      currentSection = { id: genId(), title: secMatch[2].trim(), chapters: [] };
      currentChapter = null;
      continue;
    }

    // Chapter header
    const chMatch = trimmed.match(CHAPTER_RE);
    if (chMatch && currentSection) {
      flushChapter();
      currentChapter = { id: genId(), title: chMatch[2].trim(), content: '' };
      currentSection.chapters.push(currentChapter);
      continue;
    }

    // Skip separator lines (===, ---) right after headers
    if (DIVIDER_RE.test(trimmed)) continue;

    // Content accumulation
    if (currentChapter) {
      contentLines.push(line);
    }
  }

  // Flush last
  flushChapter();
  if (currentSection) sections.push(currentSection);

  return { title, sections };
};
