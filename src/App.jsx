import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import MindMap from './components/MindMap';
import Editor from './components/Editor';
import ImportModal from './components/ImportModal';
import { exportToTxt, exportToHtml, exportToEpub, exportToPdf } from './utils/exporter';
import { Download, Sparkles, LogOut, FolderOpen, GitCommit, BookOpen, List } from 'lucide-react';
import './App.css';

function App() {
  // ── Auth ──────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    sessionStorage.getItem('novel_is_logged_in') === 'true'
  );

  // ── Projects ──────────────────────────────────────────────
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('novel_projects');
    return saved ? JSON.parse(saved) : [];
  });

  // ── Selection ─────────────────────────────────────────────
  const [activeProjectId, setActiveProjectId] = useState(() =>
    localStorage.getItem('novel_active_project_id') || null
  );
  const [activeChapterId, setActiveChapterId] = useState(null);

  // ── Modal states ──────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Mobile panel state (0=left 1=center 2=right) ─────────
  const [activeMobilePanel, setActiveMobilePanel] = useState(0);
  const touchStartX = useRef(null);

  // ── Auto-save ─────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════
  const handleLogin = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('novel_is_logged_in', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('novel_is_logged_in');
  };

  // ═══════════════════════════════════════════════════════════
  // AUTO-SAVE
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (projects.length > 0) {
      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('novel_projects', JSON.stringify(projects));
        setIsSaving(false);
      }, 1000);
    } else {
      localStorage.removeItem('novel_projects');
    }
  }, [projects]);

  // ═══════════════════════════════════════════════════════════
  // ACTIVE PROJECT — auto-select first chapter
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('novel_active_project_id', activeProjectId);
      const proj = projects.find((p) => p.id === activeProjectId);
      if (proj && proj.sections.length > 0 && proj.sections[0].chapters.length > 0) {
        setActiveChapterId(proj.sections[0].chapters[0].id);
      } else {
        setActiveChapterId(null);
      }
    } else {
      localStorage.removeItem('novel_active_project_id');
      setActiveChapterId(null);
    }
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // ═══════════════════════════════════════════════════════════
  // PROJECT ACTIONS
  // ═══════════════════════════════════════════════════════════
  const handleCreateProject = (title) => {
    const id = `proj-${Date.now()}`;
    const newProject = {
      id,
      title,
      sections: [{
        id: `sec-${Date.now()}-1`,
        title: '섹션 1',
        chapters: [{ id: `ch-${Date.now()}-1`, title: '챕터 1', content: '' }]
      }]
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(id);
    setActiveMobilePanel(1); // jump to mind-map on mobile
  };

  const handleRenameProject = (id, newTitle) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, title: newTitle } : p)));

  const handleDeleteProject = (id) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (activeProjectId === id) {
      setActiveProjectId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // ── IMPORT ────────────────────────────────────────────────
  const handleImportProject = (parsedData) => {
    const id = `proj-${Date.now()}`;
    const newProject = {
      id,
      title: parsedData.title,
      sections: parsedData.sections.map((sec) => ({
        id: sec.id || `sec-${Date.now()}-${Math.random().toString(36).substr(2,6)}`,
        title: sec.title,
        chapters: sec.chapters.map((ch) => ({
          id: ch.id || `ch-${Date.now()}-${Math.random().toString(36).substr(2,6)}`,
          title: ch.title,
          content: ch.content || ''
        }))
      }))
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(id);
    setShowImportModal(false);
    setActiveMobilePanel(1); // jump to mind-map after import
  };

  // ═══════════════════════════════════════════════════════════
  // SECTION ACTIONS
  // ═══════════════════════════════════════════════════════════
  const handleAddSection = (sectionTitle) => {
    if (!activeProjectId) return;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: [...p.sections, {
          id: `sec-${Date.now()}`,
          title: sectionTitle,
          chapters: [{ id: `ch-${Date.now()}`, title: '챕터 1', content: '' }]
        }]
      };
    }));
  };

  const handleRenameSection = (secId, newTitle) => {
    if (!activeProjectId) return;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => sec.id === secId ? { ...sec, title: newTitle } : sec)
      };
    }));
  };

  const handleDeleteSection = (secId) => {
    if (!activeProjectId) return;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      const sec = p.sections.find((s) => s.id === secId);
      if (sec?.chapters.some((ch) => ch.id === activeChapterId)) setActiveChapterId(null);
      return { ...p, sections: p.sections.filter((s) => s.id !== secId) };
    }));
  };

  // ═══════════════════════════════════════════════════════════
  // CHAPTER ACTIONS
  // ═══════════════════════════════════════════════════════════
  const handleAddChapter = (secId, chapterTitle) => {
    if (!activeProjectId) return;
    const newChId = `ch-${Date.now()}`;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => {
          if (sec.id !== secId) return sec;
          return { ...sec, chapters: [...sec.chapters, { id: newChId, title: chapterTitle, content: '' }] };
        })
      };
    }));
  };

  const handleRenameChapter = (chId, newTitle) => {
    if (!activeProjectId) return;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => ({
          ...sec,
          chapters: sec.chapters.map((ch) => ch.id === chId ? { ...ch, title: newTitle } : ch)
        }))
      };
    }));
  };

  const handleDeleteChapter = (secId, chId) => {
    if (!activeProjectId) return;
    if (activeChapterId === chId) setActiveChapterId(null);
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => {
          if (sec.id !== secId) return sec;
          return { ...sec, chapters: sec.chapters.filter((ch) => ch.id !== chId) };
        })
      };
    }));
  };

  // ═══════════════════════════════════════════════════════════
  // CHAPTER CONTENT
  // ═══════════════════════════════════════════════════════════
  const handleUpdateChapterContent = useCallback((chId, content) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => ({
          ...sec,
          chapters: sec.chapters.map((ch) => ch.id === chId ? { ...ch, content } : ch)
        }))
      };
    }));
  }, [activeProjectId]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT TRIGGERS
  // ═══════════════════════════════════════════════════════════
  const triggerTxtExport  = () => { if (activeProject) { exportToTxt(activeProject);  setShowExportModal(false); } };
  const triggerHtmlExport = () => { if (activeProject) { exportToHtml(activeProject); setShowExportModal(false); } };
  const triggerEpubExport = async () => { if (activeProject) { await exportToEpub(activeProject); setShowExportModal(false); } };
  const triggerPdfExport  = async () => { if (activeProject) { await exportToPdf(activeProject);  setShowExportModal(false); } };

  // ═══════════════════════════════════════════════════════════
  // MOBILE SWIPE
  // ═══════════════════════════════════════════════════════════
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActiveMobilePanel((p) => Math.min(p + 1, 2)); // swipe left → next panel
      else          setActiveMobilePanel((p) => Math.max(p - 1, 0)); // swipe right → prev panel
    }
    touchStartX.current = null;
  };

  // ── Chapter select on mobile → jump to editor ──────────────
  const handleSelectChapter = (chId) => {
    setActiveChapterId(chId);
    setActiveMobilePanel(2); // jump to editor
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="workspace-app">
      {/* ── Top Navbar ── */}
      <header className="workspace-navbar">
        <div className="navbar-left">
          <Sparkles className="navbar-logo" size={24} />
          <h1>Novel Studio <span className="version-tag">Pro</span></h1>
        </div>
        <div className="navbar-actions">
          <button
            className="navbar-btn import-btn"
            onClick={() => setShowImportModal(true)}
          >
            <FolderOpen size={16} />
            <span className="navbar-btn-label">가져오기</span>
          </button>
          {activeProject && (
            <button
              className="navbar-btn export-btn"
              onClick={() => setShowExportModal(true)}
            >
              <Download size={16} />
              <span className="navbar-btn-label">내보내기</span>
            </button>
          )}
          <button className="navbar-btn logout-btn-top" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="navbar-btn-label">로그아웃</span>
          </button>
        </div>
      </header>

      {/* ── Main 3-Panel Grid ── */}
      <main
        className="workspace-grid"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile sliding wrapper */}
        <div
          className="mobile-panels-slider"
          style={{ transform: `translateX(-${activeMobilePanel * 33.3333}%)` }}
        >
          {/* LEFT: Project List */}
          <div className="mobile-panel-slot">
            <ProjectList
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => { setActiveProjectId(id); setActiveMobilePanel(1); }}
              onCreateProject={handleCreateProject}
              onRenameProject={handleRenameProject}
              onDeleteProject={handleDeleteProject}
              onLogout={handleLogout}
            />
          </div>

          {/* CENTER: Mind Map */}
          <div className="mobile-panel-slot">
            <MindMap
              project={activeProject}
              activeChapterId={activeChapterId}
              onSelectChapter={handleSelectChapter}
              onAddSection={handleAddSection}
              onRenameSection={handleRenameSection}
              onDeleteSection={handleDeleteSection}
              onAddChapter={handleAddChapter}
              onRenameChapter={handleRenameChapter}
              onDeleteChapter={handleDeleteChapter}
            />
          </div>

          {/* RIGHT: Editor */}
          <div className="mobile-panel-slot">
            <Editor
              project={activeProject}
              activeChapterId={activeChapterId}
              onUpdateChapterContent={handleUpdateChapterContent}
              isSaving={isSaving}
            />
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-tab ${activeMobilePanel === 0 ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(0)}
        >
          <List size={20} />
          <span>목록</span>
        </button>
        <button
          className={`mobile-nav-tab ${activeMobilePanel === 1 ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(1)}
        >
          <GitCommit size={20} />
          <span>목차</span>
        </button>
        <button
          className={`mobile-nav-tab ${activeMobilePanel === 2 ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(2)}
        >
          <BookOpen size={20} />
          <span>집필</span>
        </button>
      </nav>

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Download className="modal-icon" size={24} />
              <div>
                <h3>소설 내보내기</h3>
                <p>현재 작성 중인 소설을 기기 및 형식에 맞게 내보냅니다.</p>
              </div>
            </div>

            <div className="modal-project-summary">
              <span className="summary-label">내보낼 소설:</span>
              <strong className="summary-title">{activeProject?.title}</strong>
            </div>

            <div className="export-options-grid">
              <button className="export-option-card txt" onClick={triggerTxtExport}>
                <div className="option-badge">TXT</div>
                <h4>텍스트 파일 (.txt)</h4>
                <p>줄 바꿈과 순수 기호 위주의 가볍고 호환성이 우수한 텍스트 문서 형식입니다. (목차 자동 포함)</p>
              </button>

              <button className="export-option-card html" onClick={triggerHtmlExport}>
                <div className="option-badge">HTML</div>
                <h4>웹 문서 파일 (.html)</h4>
                <p>세련된 스타일 서식이 가미되어 웹 브라우저에서 목차 링크 이동과 함께 즉시 볼 수 있는 파일입니다.</p>
              </button>

              <button className="export-option-card epub" onClick={triggerEpubExport}>
                <div className="option-badge">EPUB</div>
                <h4>전자책 파일 (.epub)</h4>
                <p>리디북스, 예스24, Apple Books 등 전자책 뷰어에 최적화된 표준화된 e-Reader용 포맷입니다.</p>
              </button>

              <button className="export-option-card pdf" onClick={triggerPdfExport}>
                <div className="option-badge">PDF</div>
                <h4>문서 파일 (.pdf)</h4>
                <p>인쇄 및 기기 간 레이아웃 유지가 중요한 인쇄/제본용 포맷으로 소설 전체를 내보냅니다.</p>
              </button>
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowExportModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImportModal && (
        <ImportModal
          onImport={handleImportProject}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

export default App;
