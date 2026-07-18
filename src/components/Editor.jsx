import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle } from 'lucide-react';

const Editor = ({
  project,
  activeChapterId,
  onUpdateChapterContent,
  isSaving
}) => {
  const [content, setContent] = useState('');
  const [activeChapter, setActiveChapter] = useState(null);

  // Find active chapter and section
  let chapter = null;
  let section = null;

  if (project && activeChapterId) {
    for (const sec of project.sections) {
      const ch = sec.chapters.find((c) => c.id === activeChapterId);
      if (ch) {
        chapter = ch;
        section = sec;
        break;
      }
    }
  }

  // Update editor value when active chapter changes
  useEffect(() => {
    if (chapter) {
      setContent(chapter.content || '');
      setActiveChapter(chapter);
    } else {
      setContent('');
      setActiveChapter(null);
    }
  }, [activeChapterId, project]);

  // Handle local text change
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    onUpdateChapterContent(activeChapterId, newContent);
  };

  // Counting characters and words
  const charCountWithSpace = content.length;
  const charCountWithoutSpace = content.replace(/\s/g, '').length;
  
  // Word count (split by spaces, filtering empty strings)
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  if (!chapter) {
    return (
      <div className="right-panel empty-editor animate-fade-in">
        <div className="glass-card empty-message">
          <FileText size={48} className="pulse-icon" />
          <h3>선택된 챕터가 없습니다</h3>
          <p>마인드맵에서 원하는 챕터(Chapter) 박스를 선택하면 소설을 집필할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel editor-panel">
      <div className="panel-header">
        <div className="editor-info-header">
          <span className="editor-sec-ref">{section.title}</span>
          <h2 className="editor-ch-title">{chapter.title}</h2>
        </div>
        <div className={`save-indicator ${isSaving ? 'saving' : 'saved'}`}>
          {isSaving ? (
            <>
              <span className="spinner"></span>
              <span>자동 저장 중...</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} className="check-icon" />
              <span>로컬 저장 완료</span>
            </>
          )}
        </div>
      </div>

      <div className="editor-workspace">
        <textarea
          className="novel-textarea"
          placeholder="여기에 소설 내용을 자유롭게 작성해 보세요. 입력 시 실시간으로 안전하게 자동 저장됩니다..."
          value={content}
          onChange={handleChange}
        />
      </div>

      <div className="editor-footer">
        <div className="stat-item">
          <span>글자 수 (공백 포함):</span>
          <strong>{charCountWithSpace.toLocaleString()} 자</strong>
        </div>
        <div className="stat-item">
          <span>글자 수 (공백 제외):</span>
          <strong>{charCountWithoutSpace.toLocaleString()} 자</strong>
        </div>
        <div className="stat-item">
          <span>단어 수:</span>
          <strong>{wordCount.toLocaleString()} 단어</strong>
        </div>
      </div>
    </div>
  );
};

export default Editor;
