import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import MindMap from './components/MindMap';
import Editor from './components/Editor';
import { exportToTxt, exportToHtml, exportToEpub } from './utils/exporter';
import { Download, Sparkles, LogOut, Moon, Sun, Info } from 'lucide-react';
import './App.css';

function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('novel_is_logged_in') === 'true';
  });

  // Projects State
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('novel_projects');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected State
  const [activeProjectId, setActiveProjectId] = useState(() => {
    const savedActive = localStorage.getItem('novel_active_project_id');
    return savedActive || null;
  });
  
  const [activeChapterId, setActiveChapterId] = useState(null);

  // Exporter Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Auto-save feedback state
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Handle Login
  const handleLogin = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('novel_is_logged_in', 'true');
  };

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('novel_is_logged_in');
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (projects.length > 0) {
      setIsSaving(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('novel_projects', JSON.stringify(projects));
        setIsSaving(false);
      }, 1000);
    } else {
      localStorage.removeItem('novel_projects');
    }
  }, [projects]);

  // Keep track of active project ID in localStorage
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('novel_active_project_id', activeProjectId);
      // Auto-select first chapter of the selected project if exists
      const currentProj = projects.find(p => p.id === activeProjectId);
      if (currentProj && currentProj.sections.length > 0) {
        const firstSec = currentProj.sections[0];
        if (firstSec.chapters.length > 0) {
          setActiveChapterId(firstSec.chapters[0].id);
        } else {
          setActiveChapterId(null);
        }
      } else {
        setActiveChapterId(null);
      }
    } else {
      localStorage.removeItem('novel_active_project_id');
      setActiveChapterId(null);
    }
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // 1. PROJECT ACTIONS
  const handleCreateProject = (title) => {
    const newProjId = `proj-${Date.now()}`;
    const newProject = {
      id: newProjId,
      title: title,
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          title: 'Section 1',
          chapters: [
            {
              id: `ch-${Date.now()}-1`,
              title: 'Chapter 1',
              content: ''
            }
          ]
        }
      ]
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProjId);
  };

  const handleRenameProject = (id, newTitle) => {
    setProjects(
      projects.map((p) => (p.id === id ? { ...p, title: newTitle } : p))
    );
  };

  const handleDeleteProject = (id) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (activeProjectId === id) {
      if (updated.length > 0) {
        setActiveProjectId(updated[0].id);
      } else {
        setActiveProjectId(null);
      }
    }
  };

  // 2. SECTION ACTIONS
  const handleAddSection = (sectionTitle) => {
    if (!activeProjectId) return;
    const newSecId = `sec-${Date.now()}`;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const newSection = {
            id: newSecId,
            title: sectionTitle,
            chapters: [
              {
                id: `ch-${Date.now()}`,
                title: 'Chapter 1',
                content: ''
              }
            ]
          };
          return { ...p, sections: [...p.sections, newSection] };
        }
        return p;
      })
    );
  };

  const handleRenameSection = (secId, newTitle) => {
    if (!activeProjectId) return;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const updatedSections = p.sections.map((sec) =>
            sec.id === secId ? { ...sec, title: newTitle } : sec
          );
          return { ...p, sections: updatedSections };
        }
        return p;
      })
    );
  };

  const handleDeleteSection = (secId) => {
    if (!activeProjectId) return;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const sectionToDelete = p.sections.find(s => s.id === secId);
          // If we deleted the section containing the active chapter, reset active chapter
          if (sectionToDelete && sectionToDelete.chapters.some(ch => ch.id === activeChapterId)) {
            setActiveChapterId(null);
          }
          return {
            ...p,
            sections: p.sections.filter((sec) => sec.id !== secId)
          };
        }
        return p;
      })
    );
  };

  // 3. CHAPTER ACTIONS
  const handleAddChapter = (secId, chapterTitle) => {
    if (!activeProjectId) return;
    const newChId = `ch-${Date.now()}`;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const updatedSections = p.sections.map((sec) => {
            if (sec.id === secId) {
              const newChapter = {
                id: newChId,
                title: chapterTitle,
                content: ''
              };
              return { ...sec, chapters: [...sec.chapters, newChapter] };
            }
            return sec;
          });
          return { ...p, sections: updatedSections };
        }
        return p;
      })
    );
    setActiveChapterId(newChId);
  };

  const handleRenameChapter = (chId, newTitle) => {
    if (!activeProjectId) return;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const updatedSections = p.sections.map((sec) => {
            const hasCh = sec.chapters.some((c) => c.id === chId);
            if (hasCh) {
              return {
                ...sec,
                chapters: sec.chapters.map((ch) =>
                  ch.id === chId ? { ...ch, title: newTitle } : ch
                )
              };
            }
            return sec;
          });
          return { ...p, sections: updatedSections };
        }
        return p;
      })
    );
  };

  const handleDeleteChapter = (secId, chId) => {
    if (!activeProjectId) return;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const updatedSections = p.sections.map((sec) => {
            if (sec.id === secId) {
              return {
                ...sec,
                chapters: sec.chapters.filter((c) => c.id !== chId)
              };
            }
            return sec;
          });
          return { ...p, sections: updatedSections };
        }
        return p;
      })
    );
    if (activeChapterId === chId) {
      setActiveChapterId(null);
    }
  };

  // 4. CONTENT ACTIONS
  const handleUpdateChapterContent = (chId, newContent) => {
    if (!activeProjectId) return;
    setProjects(
      projects.map((p) => {
        if (p.id === activeProjectId) {
          const updatedSections = p.sections.map((sec) => {
            const hasCh = sec.chapters.some((c) => c.id === chId);
            if (hasCh) {
              return {
                ...sec,
                chapters: sec.chapters.map((ch) =>
                  ch.id === chId ? { ...ch, content: newContent } : ch
                )
              };
            }
            return sec;
          });
          return { ...p, sections: updatedSections };
        }
        return p;
      })
    );
  };

  // 5. EXPORT WRAPPERS
  const triggerTxtExport = () => {
    if (activeProject) {
      exportToTxt(activeProject);
      setShowExportModal(false);
    }
  };

  const triggerHtmlExport = () => {
    if (activeProject) {
      exportToHtml(activeProject);
      setShowExportModal(false);
    }
  };

  const triggerEpubExport = async () => {
    if (activeProject) {
      await exportToEpub(activeProject);
      setShowExportModal(false);
    }
  };

  // Switch workspace mode logic (e.g. login gate)
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="workspace-app">
      {/* Workspace Header Top Bar */}
      <header className="workspace-navbar">
        <div className="navbar-left">
          <Sparkles className="navbar-logo" size={24} />
          <h1>Novel Studio <span className="version-tag">Pro</span></h1>
        </div>
        <div className="navbar-actions">
          {activeProject && (
            <button
              className="navbar-btn export-btn"
              onClick={() => setShowExportModal(true)}
            >
              <Download size={16} />
              소설 내보내기 (Export)
            </button>
          )}
          <button className="navbar-btn logout-btn-top" onClick={handleLogout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      {/* Main 3-Panel Workspace Grid */}
      <main className="workspace-grid">
        {/* Left Panel: Project Directory Navigator */}
        <ProjectList
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onLogout={handleLogout}
        />

        {/* Center Panel: Mind Map Outline Creator */}
        <MindMap
          project={activeProject}
          activeChapterId={activeChapterId}
          onSelectChapter={setActiveChapterId}
          onAddSection={handleAddSection}
          onRenameSection={handleRenameSection}
          onDeleteSection={handleDeleteSection}
          onAddChapter={handleAddChapter}
          onRenameChapter={handleRenameChapter}
          onDeleteChapter={handleDeleteChapter}
        />

        {/* Right Panel: Content Manuscript Editor */}
        <Editor
          project={activeProject}
          activeChapterId={activeChapterId}
          onUpdateChapterContent={handleUpdateChapterContent}
          isSaving={isSaving}
        />
      </main>

      {/* Export Modal Overlay */}
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
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setShowExportModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
