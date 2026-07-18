import JSZip from 'jszip';

// Helper to download blob files
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Strip leading "Section N." or "Chapter N." prefix from a title if the user already typed it in
// e.g. "Section 1 임꺽정" → "임꺽정", "Chapter 2 도레미" → "도레미"
// This prevents "Section 1. Section 1 임꺽정" style duplication
const cleanTitle = (prefix, index, rawTitle) => {
  if (!rawTitle) return '';
  // Remove patterns like "Section 1", "Section1", "Chapter 3", "chapter3" etc. from the start
  const pattern = new RegExp(`^\\s*${prefix}\\s*${index}[.\\s]*`, 'i');
  return rawTitle.replace(pattern, '').trim();
};

// Build a flat list of { sectionIndex, chapterIndex, sec, ch } for global chapter numbering
const buildChapterList = (project) => {
  const list = [];
  let globalChapterIdx = 1;
  project.sections.forEach((sec, sIdx) => {
    sec.chapters.forEach((ch) => {
      list.push({ sectionIndex: sIdx + 1, chapterIndex: globalChapterIdx, sec, ch });
      globalChapterIdx++;
    });
  });
  return list;
};

// Generates Text (.txt) content
export const exportToTxt = (project) => {
  const chapterList = buildChapterList(project);

  let text = `${project.title || '소설 제목 없음'}\n\n`;

  // 1. Table of Contents — clean vertical list
  text += `==================== 목 차 ====================\n`;
  project.sections.forEach((sec, sIdx) => {
    const secIdx = sIdx + 1;
    const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
    text += `Section ${secIdx}. ${secTitle}\n`;
  });
  // Flat chapter list under TOC
  chapterList.forEach(({ chapterIndex, ch }) => {
    const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
    text += `  Chapter ${chapterIndex}. ${chTitle}\n`;
  });
  text += `==============================================\n\n\n`;

  // 2. Main Content — section headers then chapters
  project.sections.forEach((sec, sIdx) => {
    const secIdx = sIdx + 1;
    const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
    text += `Section ${secIdx}. ${secTitle}\n`;
    text += `${'='.repeat(40)}\n\n`;

    const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
    chaptersInSection.forEach(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      text += `Chapter ${chapterIndex}. ${chTitle}\n`;
      text += `${'-'.repeat(25)}\n\n`;
      text += `${ch.content || ''}\n\n\n`;
    });
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${project.title || '소설'}.txt`);
};

// Generates HTML content
export const exportToHtml = (project) => {
  const chapterList = buildChapterList(project);

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${project.title || '소설'}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.9;
      color: #1f2937;
      max-width: 820px;
      margin: 0 auto;
      padding: 50px 24px;
      background-color: #fff;
    }
    h1.book-title {
      text-align: center;
      margin-bottom: 60px;
      font-size: 2.4em;
      color: #111;
      border-bottom: 3px solid #111;
      padding-bottom: 20px;
    }
    h2.section-heading {
      margin-top: 70px;
      border-bottom: 2px solid #374151;
      padding-bottom: 10px;
      color: #111;
      font-size: 1.6em;
    }
    h3.chapter-heading {
      margin-top: 40px;
      color: #374151;
      font-size: 1.25em;
      border-bottom: 1px dashed #d1d5db;
      padding-bottom: 6px;
    }
    .toc {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 32px 36px;
      margin-bottom: 60px;
    }
    .toc-title {
      font-size: 1.4em;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #111;
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .toc-list li {
      padding: 5px 0;
      line-height: 1.6;
    }
    .toc-section-item {
      font-weight: 700;
      font-size: 1em;
      margin-top: 12px;
      color: #1f2937;
    }
    .toc-chapter-item {
      font-size: 0.92em;
      padding-left: 22px;
      color: #374151;
    }
    .toc-list a {
      color: #4f46e5;
      text-decoration: none;
    }
    .toc-list a:hover {
      text-decoration: underline;
    }
    .content-paragraph {
      margin-bottom: 1.5em;
      text-indent: 1em;
      text-align: justify;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1 class="book-title">${project.title || '소설 제목 없음'}</h1>
  
  <div class="toc">
    <div class="toc-title">목차</div>
    <ul class="toc-list">
`;

  // TOC: Section headers interspersed with chapter items — vertically clean
  project.sections.forEach((sec, sIdx) => {
    const secIdx = sIdx + 1;
    const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
    const secId = `sec-${sec.id}`;
    html += `      <li class="toc-section-item"><a href="#${secId}">Section ${secIdx}. ${secTitle}</a></li>\n`;

    const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
    chaptersInSection.forEach(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      const chId = `ch-${ch.id}`;
      html += `      <li class="toc-chapter-item"><a href="#${chId}">Chapter ${chapterIndex}. ${chTitle}</a></li>\n`;
    });
  });

  html += `    </ul>
  </div>
  
  <div class="content-body">
`;

  // Main content
  project.sections.forEach((sec, sIdx) => {
    const secIdx = sIdx + 1;
    const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
    const secId = `sec-${sec.id}`;
    html += `    <h2 class="section-heading" id="${secId}">Section ${secIdx}. ${secTitle}</h2>\n`;

    const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
    chaptersInSection.forEach(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      const chId = `ch-${ch.id}`;
      html += `    <h3 class="chapter-heading" id="${chId}">Chapter ${chapterIndex}. ${chTitle}</h3>\n`;

      const paragraphs = ch.content ? ch.content.split('\n') : [''];
      paragraphs.forEach((p) => {
        if (p.trim()) {
          html += `    <p class="content-paragraph">${p.trim()}</p>\n`;
        }
      });
    });
  });

  html += `  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${project.title || '소설'}.html`);
};

// Generates EPUB container format
export const exportToEpub = async (project) => {
  const zip = new JSZip();
  const chapterList = buildChapterList(project);

  // 1. mimetype (UNCOMPRESSED)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF').file('container.xml', containerXml);

  let manifestItems = '';
  let spineItems = '';
  let tocItems = '';
  const oebps = zip.folder('OEBPS');

  // Build section TOC items + chapter XHTML pages
  project.sections.forEach((sec, sIdx) => {
    const secIdx = sIdx + 1;
    const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
    tocItems += `    <li class="section-item">\n      <span>Section ${secIdx}. ${secTitle}</span>\n      <ol>\n`;

    const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
    chaptersInSection.forEach(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      const chFileName = `chapter_${chapterIndex}.xhtml`;

      manifestItems += `    <item id="chapter_${chapterIndex}" href="${chFileName}" media-type="application/xhtml+xml"/>\n`;
      spineItems += `    <itemref idref="chapter_${chapterIndex}"/>\n`;
      tocItems += `        <li><a href="${chFileName}">Chapter ${chapterIndex}. ${chTitle}</a></li>\n`;

      const paragraphs = ch.content ? ch.content.split('\n') : [''];
      let bodyHtml = '';
      paragraphs.forEach((p) => {
        if (p.trim()) {
          bodyHtml += `      <p class="content-paragraph">${p.trim()}</p>\n`;
        }
      });

      const chapterXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko">
<head>
  <title>Chapter ${chapterIndex}. ${chTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section class="chapter-page">
    <div class="section-ref">Section ${secIdx}. ${secTitle}</div>
    <h2 class="chapter-title">Chapter ${chapterIndex}. ${chTitle}</h2>
    <div class="chapter-content">
${bodyHtml}
    </div>
  </section>
</body>
</html>`;
      oebps.file(chFileName, chapterXml);
    });

    tocItems += `      </ol>\n    </li>\n`;
  });

  // 3. styles.css
  const stylesCss = `body {
  font-family: serif;
  line-height: 1.9;
  margin: 10%;
  color: #1f2937;
  background-color: #fff;
}
.section-ref {
  font-style: italic;
  color: #9ca3af;
  font-size: 0.85em;
  margin-bottom: 4px;
}
.chapter-title {
  font-size: 1.4em;
  margin-bottom: 1.5em;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 8px;
}
.content-paragraph {
  text-indent: 1em;
  margin-bottom: 1.3em;
  text-align: justify;
}
nav#toc ol {
  list-style-type: none;
  padding-left: 0;
}
nav#toc ol ol {
  list-style-type: decimal;
  padding-left: 20px;
}
.section-item > span {
  font-weight: bold;
  display: block;
  margin-top: 14px;
}
`;
  oebps.file('styles.css', stylesCss);

  // 4. toc.xhtml
  const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko">
<head>
  <title>목차</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>목차</h1>
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`;
  oebps.file('toc.xhtml', tocXhtml);

  // 5. content.opf
  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${project.id || Date.now()}</dc:identifier>
    <dc:title>${project.title || '소설'}</dc:title>
    <dc:language>ko</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="styles" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
    <itemref idref="toc"/>
${spineItems}
  </spine>
</package>`;
  oebps.file('content.opf', contentOpf);

  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  downloadBlob(content, `${project.title || '소설'}.epub`);
};
