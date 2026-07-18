import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';

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
// Prevents "Section 1. Section 1 임꺽정" style duplication
const cleanTitle = (prefix, index, rawTitle) => {
  if (!rawTitle) return '';
  const pattern = new RegExp(`^\\s*${prefix}\\s*${index}[.\\s]*`, 'i');
  return rawTitle.replace(pattern, '').trim();
};

// Strip HTML tags to plain text (for TXT export and EPUB content)
const htmlToPlainText = (html) => {
  if (!html) return '';
  // Replace <sup>text</sup> with ^text and <sub>text</sub> with _text for TXT readability
  let text = html
    .replace(/<sup>(.*?)<\/sup>/gi, '^$1')
    .replace(/<sub>(.*?)<\/sub>/gi, '_$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  return text;
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
      // Convert HTML to plain text with sup/sub notation
      const plainContent = htmlToPlainText(ch.content || '');
      text += `Chapter ${chapterIndex}. ${chTitle}\n`;
      text += `${'-'.repeat(25)}\n\n`;
      text += `${plainContent}\n\n\n`;
    });
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${project.title || '소설'}.txt`);
};

// Shared book HTML builder (used by HTML export and PDF export)
const buildBookHtml = (project, forPdf = false) => {
  const chapterList = buildChapterList(project);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${project.title || '소설'}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.9;
      color: #1f2937;
      background-color: #ffffff;
      margin: 0;
      padding: ${forPdf ? '30px 40px' : '50px 24px'};
    }
    .pdf-content-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
    }
    h1.book-title {
      text-align: center;
      margin-bottom: 60px;
      font-size: ${forPdf ? '2.2em' : '2.4em'};
      color: #111;
      border-bottom: 3px solid #111;
      padding-bottom: 20px;
      margin-top: 20px;
    }
    h2.section-heading {
      margin-top: ${forPdf ? '45px' : '70px'};
      border-bottom: 2px solid #374151;
      padding-bottom: 10px;
      color: #111;
      font-size: ${forPdf ? '1.4em' : '1.6em'};
      page-break-before: always;
    }
    h3.chapter-heading {
      margin-top: 35px;
      color: #374151;
      font-size: ${forPdf ? '1.15em' : '1.25em'};
      border-bottom: 1px dashed #d1d5db;
      padding-bottom: 6px;
      page-break-inside: avoid;
    }
    .toc {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 28px 32px;
      margin-bottom: 50px;
      page-break-after: always;
    }
    .toc-title {
      font-size: 1.3em;
      font-weight: 700;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      color: #111;
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .toc-list li {
      padding: 4px 0;
      line-height: 1.6;
    }
    .toc-section-item {
      font-weight: 700;
      font-size: 0.98em;
      margin-top: 10px;
      color: #1f2937;
    }
    .toc-chapter-item {
      font-size: 0.88em;
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
    .chapter-content-block {
      margin-bottom: 2em;
      text-align: justify;
      color: #1f2937;
      font-size: 1.02rem;
      line-height: 1.9;
    }
    sup {
      font-size: 0.75em;
      vertical-align: super;
      line-height: 0;
      background: rgba(79, 70, 229, 0.08);
      padding: 0 2px;
      border-radius: 3px;
      color: #4f46e5;
    }
    sub {
      font-size: 0.75em;
      vertical-align: sub;
      line-height: 0;
      background: rgba(14, 165, 233, 0.08);
      padding: 0 2px;
      border-radius: 3px;
      color: #0ea5e9;
    }
  </style>
</head>
<body>
  <div class="pdf-content-wrapper">
    <h1 class="book-title">${project.title || '소설 제목 없음'}</h1>
    <div class="toc">
      <div class="toc-title">목차</div>
      <ul class="toc-list">
${project.sections.map((sec, sIdx) => {
  const secIdx = sIdx + 1;
  const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
  const secId = `sec-${sec.id}`;
  const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
  return `        <li class="toc-section-item"><a href="#${secId}">Section ${secIdx}. ${secTitle}</a></li>\n` +
    chaptersInSection.map(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      const chId = `ch-${ch.id}`;
      return `        <li class="toc-chapter-item"><a href="#${chId}">Chapter ${chapterIndex}. ${chTitle}</a></li>`;
    }).join('\n');
}).join('\n')}
      </ul>
    </div>
    <div class="content-body">
${project.sections.map((sec, sIdx) => {
  const secIdx = sIdx + 1;
  const secTitle = cleanTitle('Section', secIdx, sec.title) || `섹션 ${secIdx}`;
  const secId = `sec-${sec.id}`;
  const chaptersInSection = chapterList.filter(item => item.sec.id === sec.id);
  return `      <h2 class="section-heading" id="${secId}">Section ${secIdx}. ${secTitle}</h2>\n` +
    chaptersInSection.map(({ chapterIndex, ch }) => {
      const chTitle = cleanTitle('Chapter', chapterIndex, ch.title) || `챕터 ${chapterIndex}`;
      const chId = `ch-${ch.id}`;
      const rawContent = ch.content || '';
      return `      <h3 class="chapter-heading" id="${chId}">Chapter ${chapterIndex}. ${chTitle}</h3>\n      <div class="chapter-content-block">${rawContent}</div>`;
    }).join('\n');
}).join('\n')}
    </div>
  </div>
</body>
</html>`;
  return html;
};

// Generates HTML content
export const exportToHtml = (project) => {
  const html = buildBookHtml(project, false);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${project.title || '소설'}.html`);
};

// Generates PDF using html2pdf.js (Robust element rendering fix)
export const exportToPdf = async (project) => {
  const htmlContent = buildBookHtml(project, true);

  // 1. Create a fully visible temporary container on-screen
  // Using opacity: 1 and a zIndex value to force browser layout rendering and prevent blank canvas captures
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.zIndex = '99999';
  container.style.background = '#ffffff';
  container.style.opacity = '1'; // Fully opaque to guarantee html2canvas reads pixel values
  document.body.appendChild(container);

  // Extract the inner wrapper we want to print
  const printTarget = container.querySelector('.pdf-content-wrapper') || container;

  const opt = {
    margin: [15, 15, 15, 15], // top, right, bottom, left (mm)
    filename: `${project.title || '소설'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      background: '#ffffff', // Force canvas background fill to avoid transparency issues
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    // 2. Wait 300ms for browser to calculate styling and layout paints
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Save PDF
    await html2pdf().set(opt).from(printTarget).save();
  } catch (error) {
    console.error('PDF Generation failed:', error);
  } finally {
    // 3. Instantly clean up the temporary element
    document.body.removeChild(container);
  }
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

  // Title Page
  const titlePageXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko">
<head>
  <title>${project.title || '소설'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
  <style>
    .title-page-container {
      text-align: center;
      margin-top: 30%;
    }
    .book-title-header {
      font-size: 2.2em;
      font-weight: bold;
      margin-bottom: 24px;
      color: #111;
    }
    .book-author-meta {
      font-size: 1.1em;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="title-page-container">
    <h1 class="book-title-header">${project.title || '소설 제목 없음'}</h1>
    <p class="book-author-meta">저자: admin</p>
  </div>
</body>
</html>`;
  oebps.file('title_page.xhtml', titlePageXml);

  // title_page is added to manifest only — spine order is controlled explicitly in content.opf
  manifestItems += `    <item id="title_page" href="title_page.xhtml" media-type="application/xhtml+xml"/>\n`;

  // Chapters & Sections
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

      const rawContent = ch.content || '';
      const lines = rawContent
        .split(/<br\s*\/?>/i)
        .map(line => line.trim())
        .filter(line => line !== '' && line !== '<div>' && line !== '</div>');
      let bodyHtml = lines.length
        ? lines.map(p => `      <p class="content-paragraph">${p}</p>`).join('\n')
        : '';

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

  // styles.css
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
  font-size: 0.82em;
  margin-bottom: 4px;
}
.chapter-title {
  font-size: 1.3em;
  margin-bottom: 1.4em;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 8px;
}
.content-paragraph {
  text-indent: 1em;
  margin-bottom: 1.2em;
  text-align: justify;
}
sup { font-size: 0.72em; vertical-align: super; }
sub { font-size: 0.72em; vertical-align: sub; }
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

  // toc.xhtml
  const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko">
<head>
  <title>${project.title || '소설'} - 목차</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${project.title || '소설'}</h1>
    <h2>목차</h2>
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`;
  oebps.file('toc.xhtml', tocXhtml);

  // content.opf
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
    <itemref idref="title_page"/>
    <itemref idref="toc"/>
${spineItems}
  </spine>
</package>`;
  oebps.file('content.opf', contentOpf);

  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  downloadBlob(content, `${project.title || '소설'}.epub`);
};
