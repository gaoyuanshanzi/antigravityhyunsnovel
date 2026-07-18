import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, CheckCircle, Superscript, Subscript } from 'lucide-react';

const Editor = ({
  project,
  activeChapterId,
  onUpdateChapterContent,
  isSaving
}) => {
  const editorRef = useRef(null);
  const lastChapterIdRef = useRef(null);

  // Find active chapter and section
  let chapter = null;
  let section = null;
  if (project && activeChapterId) {
    for (const sec of project.sections) {
      const ch = sec.chapters.find((c) => c.id === activeChapterId);
      if (ch) { chapter = ch; section = sec; break; }
    }
  }

  // Load content into editor when active chapter changes
  useEffect(() => {
    if (!editorRef.current) return;

    // Only reload if the chapter actually changed
    if (lastChapterIdRef.current === activeChapterId) return;
    lastChapterIdRef.current = activeChapterId;

    if (chapter) {
      // Set innerHTML to support rich text (superscript/subscript)
      editorRef.current.innerHTML = chapter.content || '';
      editorRef.current.focus();
    } else {
      editorRef.current.innerHTML = '';
    }
  }, [activeChapterId, chapter]);

  // Handle content change — save innerHTML (preserves <sup>/<sub> tags)
  const handleInput = useCallback(() => {
    if (!editorRef.current || !activeChapterId) return;
    const htmlContent = editorRef.current.innerHTML;
    onUpdateChapterContent(activeChapterId, htmlContent);
  }, [activeChapterId, onUpdateChapterContent]);

  // execCommand helper — works reliably for super/subscript
  const applyFormat = useCallback((command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, null);
    // Trigger save after formatting
    handleInput();
  }, [handleInput]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e) => {
    // Ctrl+Shift++ (or Ctrl+Shift+=) → Superscript (MS Word style)
    if (e.ctrlKey && e.shiftKey && (e.key === '+' || e.key === '=' || e.code === 'Equal')) {
      e.preventDefault();
      applyFormat('superscript');
      return;
    }
    // Ctrl+Shift+- (or Ctrl+Shift+_) → Subscript (robust key check)
    if (e.ctrlKey && e.shiftKey && (e.key === '-' || e.key === '_' || e.code === 'Minus')) {
      e.preventDefault();
      applyFormat('subscript');
      return;
    }
  }, [applyFormat]);

  // Compute text stats from plain text (strip HTML tags)
  const getPlainText = () => {
    if (!editorRef.current) return '';
    return editorRef.current.innerText || '';
  };

  const [stats, setStats] = useState({ chars: 0, charsNoSpace: 0, words: 0 });

  const updateStats = useCallback(() => {
    const plain = getPlainText();
    setStats({
      chars: plain.length,
      charsNoSpace: plain.replace(/\s/g, '').length,
      words: plain.trim() ? plain.trim().split(/\s+/).length : 0,
    });
  }, []);

  // Update stats on input
  const handleInputWithStats = useCallback(() => {
    handleInput();
    updateStats();
  }, [handleInput, updateStats]);

  // Recalculate stats when chapter changes
  useEffect(() => {
    // Small delay to let the innerHTML get set first
    const t = setTimeout(updateStats, 80);
    return () => clearTimeout(t);
  }, [activeChapterId, updateStats]);

  if (!chapter) {
    return (
      <div className="right-panel empty-editor animate-fade-in">
        <div className="glass-card empty-message">
          <FileText size={44} className="pulse-icon" />
          <h3>선택된 챕터가 없습니다</h3>
          <p>마인드맵에서 원하는 챕터(Chapter) 박스를 선택하면 소설을 집필할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel editor-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="editor-info-header">
          <span className="editor-sec-ref">{section.title}</span>
          <h2 className="editor-ch-title">{chapter.title}</h2>
        </div>
        <div className={`save-indicator ${isSaving ? 'saving' : 'saved'}`}>
          {isSaving ? (
            <><span className="spinner"></span><span>자동 저장 중...</span></>
          ) : (
            <><CheckCircle size={13} className="check-icon" /><span>저장 완료</span></>
          )}
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            title="윗첨자 (Ctrl+Shift++)"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur
              applyFormat('superscript');
            }}
          >
            <span className="toolbar-btn-content">
              X<sup>2</sup>
            </span>
            <span className="toolbar-btn-label">윗첨자</span>
          </button>
          <button
            className="toolbar-btn"
            title="아래첨자 (Ctrl+Shift+-)"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur
              applyFormat('subscript');
            }}
          >
            <span className="toolbar-btn-content">
              X<sub>2</sub>
            </span>
            <span className="toolbar-btn-label">아래첨자</span>
          </button>
        </div>
        <div className="toolbar-hint">
          <span>단축키: 윗첨자 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>+</kbd> &nbsp;|&nbsp; 아래첨자 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>-</kbd></span>
        </div>
      </div>

      {/* ContentEditable Editor Area */}
      <div className="editor-workspace">
        <div
          ref={editorRef}
          className="novel-editor"
          contentEditable={true}
          suppressContentEditableWarning={true}
          onInput={handleInputWithStats}
          onKeyDown={handleKeyDown}
          data-placeholder="여기에 소설 내용을 자유롭게 작성해 보세요. 입력 시 실시간으로 자동 저장됩니다..."
          spellCheck={false}
        />
      </div>

      {/* Footer Stats */}
      <div className="editor-footer">
        <div className="stat-item">
          <span>글자 수 (공백 포함):</span>
          <strong>{stats.chars.toLocaleString()} 자</strong>
        </div>
        <div className="stat-item">
          <span>글자 수 (공백 제외):</span>
          <strong>{stats.charsNoSpace.toLocaleString()} 자</strong>
        </div>
        <div className="stat-item">
          <span>단어 수:</span>
          <strong>{stats.words.toLocaleString()} 단어</strong>
        </div>
      </div>
    </div>
  );
};

export default Editor;
