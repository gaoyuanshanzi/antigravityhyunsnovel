import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import MindMap from './components/MindMap';
import Editor from './components/Editor';
import ImportModal from './components/ImportModal';
import { exportToTxt, exportToHtml, exportToEpub, exportToPdf } from './utils/exporter';
import { Download, Sparkles, LogOut, FolderOpen, GitCommit, BookOpen, List, Plus } from 'lucide-react';
import './App.css';

function App() {
  // ── Auth ──────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    sessionStorage.getItem('novel_is_logged_in') === 'true'
  );

  // ── Projects (Fetched from Neon DB API on launch) ─────────────────
  const [projects, setProjects] = useState([]);

  // ── Selection ─────────────────────────────────────────────
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);

  // ── Modal states ──────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Mobile panel state (0=left 1=center 2=right) ─────────
  const [activeMobilePanel, setActiveMobilePanel] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

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
  // NEON DB LOADER
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          const formatted = data.map((row) => ({
            id: row.id,
            title: row.title,
            sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections
          }));
          setProjects(formatted);
          
          // Restore last selected project from session cache if available
          const cachedActiveId = sessionStorage.getItem('novel_active_project_id');
          if (cachedActiveId && formatted.some((p) => p.id === cachedActiveId)) {
            setActiveProjectId(cachedActiveId);
          }
        })
        .catch((err) => console.error('Failed to load projects from Neon DB:', err));
    } else {
      setProjects([]);
      setActiveProjectId(null);
    }
  }, [isLoggedIn]);

  // ═══════════════════════════════════════════════════════════
  // AUTO-SAVE (Neon DB Sync with Debounce)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (projects.length > 0) {
      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Sync all local projects metadata and structure to remote Neon DB
          for (const proj of projects) {
            await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: proj.id,
                title: proj.title,
                sections: proj.sections
              })
            });
          }
        } catch (error) {
          console.error('Remote DB auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1200);
    }
  }, [projects]);

  // ═══════════════════════════════════════════════════════════
  // ACTIVE PROJECT — auto-select first chapter
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (activeProjectId) {
      sessionStorage.setItem('novel_active_project_id', activeProjectId);
      const proj = projects.find((p) => p.id === activeProjectId);
      if (proj && proj.sections.length > 0 && proj.sections[0].chapters.length > 0) {
        setActiveChapterId(proj.sections[0].chapters[0].id);
      } else {
        setActiveChapterId(null);
      }
    } else {
      sessionStorage.removeItem('novel_active_project_id');
      setActiveChapterId(null);
    }
  }, [activeProjectId, projects]);

  // Force reset horizontal scroll offset when panel changes to avoid browser layout shifts
  useEffect(() => {
    const grid = document.querySelector('.workspace-grid');
    if (grid) {
      grid.scrollLeft = 0;
    }
  }, [activeMobilePanel]);

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

  const handleDeleteProject = async (id) => {
    if (!confirm('이 소설을 정말 완전히 삭제하시겠습니까? 데이터베이스에서 모든 데이터가 영구 삭제됩니다.')) return;
    try {
      await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('소설 삭제에 실패했습니다.');
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
  const handleAddSection = (sectionTitle, position = 'bottom') => {
    if (!activeProjectId) return;
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      const newSection = {
        id: `sec-${Date.now()}`,
        title: sectionTitle,
        chapters: [{ id: `ch-${Date.now()}`, title: '챕터 1', content: '' }]
      };
      const updatedSections = position === 'top'
        ? [newSection, ...p.sections]
        : [...p.sections, newSection];
      return {
        ...p,
        sections: updatedSections
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
  const handleAddChapter = (secId, chapterTitle, position = 'bottom') => {
    if (!activeProjectId) return;
    const newChId = `ch-${Date.now()}`;
    const newChapter = { id: newChId, title: chapterTitle, content: '' };
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => {
          if (sec.id !== secId) return sec;
          const updatedChapters = position === 'top'
            ? [newChapter, ...sec.chapters]
            : [...sec.chapters, newChapter];
          return { ...sec, chapters: updatedChapters };
        })
      };
    }));
  };

  const handleAddChapterAtPosition = (secId, targetChId, chapterTitle, position) => {
    if (!activeProjectId) return;
    const newChId = `ch-${Date.now()}`;
    const newChapter = { id: newChId, title: chapterTitle, content: '' };
    setProjects(projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sections: p.sections.map((sec) => {
          if (sec.id !== secId) return sec;
          const index = sec.chapters.findIndex((ch) => ch.id === targetChId);
          if (index === -1) return sec;
          const updatedChapters = [...sec.chapters];
          if (position === 'top') {
            updatedChapters.splice(index, 0, newChapter);
          } else {
            updatedChapters.splice(index + 1, 0, newChapter);
          }
          return { ...sec, chapters: updatedChapters };
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
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    
    // Check if horizontal movement is dominant and meets threshold (40px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setActiveMobilePanel((p) => Math.min(p + 1, 2)); // Swipe Left -> Go Right
      } else {
        setActiveMobilePanel((p) => Math.max(p - 1, 0)); // Swipe Right -> Go Left
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
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
        <div className="navbar-top-row">
          <div className="navbar-left">
            <Sparkles className="navbar-logo" size={24} />
            <h1>Novel Studio <span className="version-tag">Pro</span></h1>
          </div>
          <div className="navbar-actions">
            {activeProjectId && (
              <button
                className="navbar-btn home-btn-top"
                onClick={() => setActiveProjectId(null)}
                title="소설 작업실 선택 대시보드로 돌아갑니다"
              >
                <FolderOpen size={16} />
                <span className="navbar-btn-label">다른 소설 열기</span>
              </button>
            )}
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
        </div>

        {/* ── Mobile Top Navigation Tabs (Nested inside header) ── */}
        <nav className="mobile-top-tabs">
          <button
            className={`mobile-tab-btn ${activeMobilePanel === 0 ? 'active' : ''}`}
            onClick={() => setActiveMobilePanel(0)}
          >
            <List size={16} />
            <span>소설 목록</span>
          </button>
          <button
            className={`mobile-tab-btn ${activeMobilePanel === 1 ? 'active' : ''}`}
            onClick={() => setActiveMobilePanel(1)}
          >
            <GitCommit size={16} />
            <span>목차 마인드맵</span>
          </button>
          <button
            className={`mobile-tab-btn ${activeMobilePanel === 2 ? 'active' : ''}`}
            onClick={() => setActiveMobilePanel(2)}
          >
            <BookOpen size={16} />
            <span>본문 에디터</span>
          </button>
        </nav>
      </header>

      {/* ── Main 3-Panel Grid or Selector ── */}
      {activeProjectId ? (
        <main
          className="workspace-grid"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Mobile sliding wrapper */}
          <div
            className="mobile-panels-slider"
            style={{ transform: `translateX(-${activeMobilePanel * 100}vw)` }}
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
                onAddChapterAtPosition={handleAddChapterAtPosition}
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
      ) : (
        <div className="project-selector-overlay">
          <div className="project-selector-card">
            <div className="selector-header">
              <Sparkles className="selector-logo" size={32} />
              <h2>소설 작업실 (Neon DB Cloud)</h2>
              <p>용량 한계가 없는 Neon.tech PostgreSQL에 소설을 영구 저장합니다. 집필할 소설을 선택해 주세요.</p>
            </div>

            <div className="projects-grid-list">
              {projects.length === 0 ? (
                <div className="empty-db-state">
                  <p>등록된 소설이 없습니다. 아래 버튼으로 새로 만들거나 .html 파일을 가져오세요!</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div key={proj.id} className="project-card-item" onClick={() => { setActiveProjectId(proj.id); setActiveMobilePanel(1); }}>
                    <div className="card-info">
                      <h3>{proj.title}</h3>
                      <p>섹션: {proj.sections.length}개 / 총 챕터: {proj.sections.reduce((sum, s) => sum + s.chapters.length, 0)}개</p>
                    </div>
                    <button
                      className="card-delete-btn"
                      title="클라우드에서 영구 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="selector-actions">
              <button
                className="selector-btn create"
                onClick={() => {
                  const title = prompt('새 소설 제목을 입력하세요:');
                  if (title && title.trim()) {
                    handleCreateProject(title.trim());
                  }
                }}
              >
                <Plus size={16} />
                <span>새 소설 생성</span>
              </button>
              <button
                className="selector-btn import"
                onClick={() => setShowImportModal(true)}
              >
                <FolderOpen size={16} />
                <span>소설 가져오기 (.html)</span>
              </button>
              <button
                className="selector-btn logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
