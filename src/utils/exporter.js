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

// Generates Text content
export const exportToTxt = (project) => {
  let text = `${project.title}\n\n`;

  // 1. Table of Contents
  text += `==================== 목 차 ====================\n`;
  let sectionIndex = 1;
  let chapterIndex = 1;
  project.sections.forEach((sec) => {
    text += `- Section ${sectionIndex}. ${sec.title || `섹션 ${sectionIndex}`}\n`;
    sec.chapters.forEach((ch) => {
      text += `  - Chapter ${chapterIndex}. ${ch.title || `챕터 ${chapterIndex}`}\n`;
      chapterIndex++;
    });
    sectionIndex++;
  });
  text += `==============================================\n\n\n`;

  // 2. Main Content
  sectionIndex = 1;
  chapterIndex = 1;
  project.sections.forEach((sec) => {
    text += `Section ${sectionIndex}. ${sec.title || `섹션 ${sectionIndex}`}\n`;
    text += `${'='.repeat(40)}\n\n`;

    sec.chapters.forEach((ch) => {
      text += `Chapter ${chapterIndex}. ${ch.title || `챕터 ${chapterIndex}`}\n`;
      text += `${'-'.repeat(25)}\n\n`;
      text += `${ch.content || ''}\n\n\n`;
      chapterIndex++;
    });
    sectionIndex++;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${project.title || '소설'}.txt`);
};

// Generates HTML content
export const exportToHtml = (project) => {
  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${project.title || '소설'}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #fcfcfc;
    }
    h1 {
      text-align: center;
      margin-bottom: 50px;
      font-size: 2.5em;
      color: #111;
    }
    h2 {
      margin-top: 60px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      color: #222;
      font-size: 1.8em;
    }
    h3 {
      margin-top: 40px;
      color: #444;
      font-size: 1.4em;
      border-bottom: 1px dashed #ccc;
      padding-bottom: 5px;
    }
    .toc {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 50px;
    }
    .toc h2 {
      margin-top: 0;
      border-bottom: 1px solid #ccc;
      font-size: 1.5em;
    }
    .toc ul {
      list-style-type: none;
      padding-left: 0;
    }
    .toc li {
      margin: 10px 0;
    }
    .toc a {
      color: #0066cc;
      text-decoration: none;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    .toc-chapters {
      padding-left: 20px;
      list-style-type: circle;
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
  <h1>${project.title || '소설 제목 없음'}</h1>
  
  <div class="toc">
    <h2>목차</h2>
    <ul>
  `;

  // 1. Table of Contents HTML
  let sectionIndex = 1;
  let chapterIndex = 1;
  project.sections.forEach((sec) => {
    const secId = `sec-${sec.id}`;
    html += `      <li>
        <a href="#${secId}">Section ${sectionIndex}. ${sec.title || `섹션 ${sectionIndex}`}</a>
        <ul class="toc-chapters">
    `;
    sec.chapters.forEach((ch) => {
      const chId = `ch-${ch.id}`;
      html += `          <li><a href="#${chId}">Chapter ${chapterIndex}. ${ch.title || `챕터 ${chapterIndex}`}</a></li>`;
      chapterIndex++;
    });
    html += `        </ul>
      </li>
    `;
    sectionIndex++;
  });

  html += `    </ul>
  </div>
  
  <div class="content-body">
  `;

  // 2. Content HTML
  sectionIndex = 1;
  chapterIndex = 1;
  project.sections.forEach((sec) => {
    const secId = `sec-${sec.id}`;
    html += `    <h2 id="${secId}">Section ${sectionIndex}. ${sec.title || `섹션 ${sectionIndex}`}</h2>\n`;

    sec.chapters.forEach((ch) => {
      const chId = `ch-${ch.id}`;
      html += `    <h3 id="${chId}">Chapter ${chapterIndex}. ${ch.title || `챕터 ${chapterIndex}`}</h3>\n`;
      
      // Formatting paragraphs by splitting lines
      const paragraphs = ch.content ? ch.content.split('\n') : [''];
      paragraphs.forEach((p) => {
        if (p.trim()) {
          html += `    <p class="content-paragraph">${p.trim()}</p>\n`;
        }
      });
      chapterIndex++;
    });
    sectionIndex++;
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

  // 1. mimetype (Must be FIRST and UNCOMPRESSED in zip)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF').file('container.xml', containerXml);

  // Prepare manifest items and spine references
  let manifestItems = '';
  let spineItems = '';
  let tocItems = '';
  let chapterIndex = 1;
  let sectionIndex = 1;
  
  const oebps = zip.folder('OEBPS');

  // Loop through chapters to generate XHTML pages
  project.sections.forEach((sec) => {
    let sectionText = `Section ${sectionIndex}. ${sec.title || `섹션 ${sectionIndex}`}`;
    tocItems += `    <li class="section-item">
      <span>${sectionText}</span>
      <ol>
    `;

    sec.chapters.forEach((ch) => {
      const chFileName = `chapter_${chapterIndex}.xhtml`;
      const chTitle = `Chapter ${chapterIndex}. ${ch.title || `챕터 ${chapterIndex}`}`;
      
      // Manifest and spine mapping
      manifestItems += `    <item id="chapter_${chapterIndex}" href="${chFileName}" media-type="application/xhtml+xml"/>\n`;
      spineItems += `    <itemref idref="chapter_${chapterIndex}"/>\n`;
      
      // TOC linking
      tocItems += `        <li><a href="${chFileName}">${chTitle}</a></li>\n`;

      // Generate chapter body content
      const paragraphs = ch.content ? ch.content.split('\n') : [''];
      let bodyParagraphsHtml = '';
      paragraphs.forEach((p) => {
        if (p.trim()) {
          bodyParagraphsHtml += `      <p class="content-paragraph">${p.trim()}</p>\n`;
        }
      });

      const chapterXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko">
<head>
  <title>${chTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section class="chapter-page">
    <div class="section-ref">${sectionText}</div>
    <h2 class="chapter-title">${chTitle}</h2>
    <div class="chapter-content">
${bodyParagraphsHtml}
    </div>
  </section>
</body>
</html>`;

      oebps.file(chFileName, chapterXml);
      chapterIndex++;
    });

    tocItems += `      </ol>
    </li>\n`;
    sectionIndex++;
  });

  // 3. OEBPS/styles.css
  const stylesCss = `body {
  font-family: serif;
  line-height: 1.8;
  margin: 10%;
  color: #111;
  background-color: #fff;
}
h1 {
  text-align: center;
  font-size: 2em;
  margin-top: 20%;
  margin-bottom: 10%;
}
h2 {
  font-size: 1.5em;
  margin-top: 10%;
  border-bottom: 1px solid #666;
  padding-bottom: 5px;
}
.section-ref {
  font-style: italic;
  color: #666;
  font-size: 0.9em;
  margin-bottom: 5px;
}
.chapter-title {
  margin-top: 0;
}
.content-paragraph {
  text-indent: 1em;
  margin-bottom: 1.2em;
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
  margin-top: 15px;
  font-size: 1.1em;
}
`;
  oebps.file('styles.css', stylesCss);

  // 4. OEBPS/toc.xhtml (EPUB 3 Table of Contents)
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

  // 5. OEBPS/content.opf
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

  // Generate ZIP and download
  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  downloadBlob(content, `${project.title || '소설'}.epub`);
};
