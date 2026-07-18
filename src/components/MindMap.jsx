import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, GitCommit } from 'lucide-react';

const MindMap = ({
  project,
  activeChapterId,
  onSelectChapter,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter
}) => {
  const containerRef = useRef(null);
  const [connections, setConnections] = useState([]);
  
  // States for inline editing
  const [editingNode, setEditingNode] = useState(null); // { type: 'section'|'chapter', id, value }
  
  // Track active Section based on active Chapter, or click state
  const [clickedSectionId, setClickedSectionId] = useState(null);

  // Find which section the active chapter belongs to
  let activeSectionId = clickedSectionId;
  if (project && activeChapterId) {
    const parentSec = project.sections.find(sec => 
      sec.chapters.some(ch => ch.id === activeChapterId)
    );
    if (parentSec) {
      activeSectionId = parentSec.id;
    }
  }

  // Calculate coordinates for SVG connecting lines
  const updateConnections = () => {
    if (!containerRef.current || !project) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const rootEl = document.getElementById('node-root');
    const newConnections = [];

    if (rootEl) {
      const rootRect = rootEl.getBoundingClientRect();
      const rootX = rootRect.right - containerRect.left;
      const rootY = rootRect.top + rootRect.height / 2 - containerRect.top;

      project.sections.forEach((sec) => {
        const secEl = document.getElementById(`node-sec-${sec.id}`);
        if (secEl) {
          const secRect = secEl.getBoundingClientRect();
          const secLeftX = secRect.left - containerRect.left;
          const secLeftY = secRect.top + secRect.height / 2 - containerRect.top;
          
          const isSecActive = activeSectionId === sec.id;

          newConnections.push({
            id: `root-to-${sec.id}`,
            x1: rootX,
            y1: rootY,
            x2: secLeftX,
            y2: secLeftY,
            active: isSecActive
          });

          const secRightX = secRect.right - containerRect.left;
          const secRightY = secRect.top + secRect.height / 2 - containerRect.top;

          sec.chapters.forEach((ch) => {
            const chEl = document.getElementById(`node-ch-${ch.id}`);
            if (chEl) {
              const chRect = chEl.getBoundingClientRect();
              const chLeftX = chRect.left - containerRect.left;
              const chLeftY = chRect.top + chRect.height / 2 - containerRect.top;
              
              const isChActive = activeChapterId === ch.id;

              newConnections.push({
                id: `sec-${sec.id}-to-ch-${ch.id}`,
                x1: secRightX,
                y1: secRightY,
                x2: chLeftX,
                y2: chLeftY,
                active: isChActive
              });
            }
          });
        }
      });
    }
    setConnections(newConnections);
  };

  // Re-run connection update when project structure changes, active selection changes, or window resizes
  useEffect(() => {
    updateConnections();
    
    // Add small delay to ensure DOM is fully painted
    const timer = setTimeout(updateConnections, 50);

    window.addEventListener('resize', updateConnections);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateConnections);
    };
  }, [project, activeChapterId, activeSectionId, clickedSectionId]);

  if (!project) {
    return (
      <div className="center-panel empty-map">
        <div className="glass-card empty-message">
          <GitCommit size={48} className="pulse-icon" />
          <h3>선택된 소설이 없습니다</h3>
          <p>왼쪽 패널에서 소설을 선택하거나 '새로 생성'해 주세요.</p>
        </div>
      </div>
    );
  }

  // Inline edit handlers
  const startEditing = (type, id, currentValue) => {
    setEditingNode({ type, id, value: currentValue });
  };

  const handleEditSubmit = () => {
    if (!editingNode) return;
    const { type, id, value } = editingNode;
    if (value.trim()) {
      if (type === 'section') {
        onRenameSection(id, value.trim());
      } else if (type === 'chapter') {
        onRenameChapter(id, value.trim());
      }
    }
    setEditingNode(null);
  };

  return (
    <div className="center-panel" ref={containerRef}>
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <GitCommit className="panel-title-icon" size={20} />
          <h2>목차 마인드맵 플래너</h2>
        </div>
        <div className="map-legend">
          <span className="legend-item"><span className="legend-dot root"></span>소설</span>
          <span className="legend-item"><span className="legend-dot section"></span>섹션</span>
          <span className="legend-item"><span className="legend-dot chapter"></span>챕터</span>
        </div>
      </div>

      <div className="mindmap-workspace">
        {/* Dynamic SVG Connection Layer */}
        <svg className="mindmap-svg-layer">
          {connections.map((conn) => {
            // Cubic Bezier curve paths for smooth organic connection lines
            const dx = Math.abs(conn.x2 - conn.x1) * 0.5;
            const pathData = `M ${conn.x1} ${conn.y1} C ${conn.x1 + dx} ${conn.y1}, ${conn.x2 - dx} ${conn.y2}, ${conn.x2} ${conn.y2}`;
            
            return (
              <path
                key={conn.id}
                d={pathData}
                className={`connector-line ${conn.active ? 'active-line' : ''}`}
              />
            );
          })}
        </svg>

        {/* Column 1: Novel Root Node */}
        <div className="mindmap-column root-column">
          <div
            id="node-root"
            className={`mindmap-node root-node ${!activeSectionId ? 'highlighted' : ''}`}
          >
            <div className="node-content">
              <span className="node-tag">Novel Title</span>
              <span className="node-title">{project.title}</span>
            </div>
            <button
              className="node-add-btn"
              title="섹션 추가"
              onClick={() => {
                const count = project.sections.length + 1;
                onAddSection(`Section ${count}`);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Column 2: Sections */}
        <div className="mindmap-column section-column">
          {project.sections.map((sec, sIdx) => {
            const isSelected = activeSectionId === sec.id;
            const isEditing = editingNode?.type === 'section' && editingNode?.id === sec.id;

            return (
              <div
                key={sec.id}
                id={`node-sec-${sec.id}`}
                className={`mindmap-node section-node ${isSelected ? 'highlighted' : ''}`}
                onClick={() => setClickedSectionId(sec.id)}
              >
                {isEditing ? (
                  <div className="node-edit-form" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingNode.value}
                      onChange={(e) => setEditingNode({ ...editingNode, value: e.target.value })}
                      autoFocus
                      onBlur={handleEditSubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSubmit();
                        if (e.key === 'Escape') setEditingNode(null);
                      }}
                    />
                    <button onClick={handleEditSubmit} className="btn-confirm"><Check size={12} /></button>
                  </div>
                ) : (
                  <>
                    <div className="node-content">
                      <span className="node-tag">Section {sIdx + 1}</span>
                      <span className="node-title">{sec.title || `섹션 ${sIdx + 1}`}</span>
                    </div>
                    <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="node-action-icon"
                        title="이름 수정"
                        onClick={() => startEditing('section', sec.id, sec.title)}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="node-action-icon delete"
                        title="섹션 삭제"
                        onClick={() => {
                          if (confirm(`'${sec.title}' 섹션과 이에 속한 모든 챕터를 삭제하시겠습니까?`)) {
                            onDeleteSection(sec.id);
                          }
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <button
                      className="node-add-btn"
                      title="챕터 추가"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find this section's chapters count
                        const count = sec.chapters.length + 1;
                        onAddChapter(sec.id, `Chapter ${count}`);
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Column 3: Chapters */}
        <div className="mindmap-column chapter-column">
          {project.sections.map((sec) => {
            // Only render chapters for the selected section, or show them grouped visually.
            // Rendering chapters mapped under their parent section vertical coordinates works best.
            return sec.chapters.map((ch, cIdx) => {
              const isSelected = activeChapterId === ch.id;
              const isEditing = editingNode?.type === 'chapter' && editingNode?.id === ch.id;
              const isParentSecActive = activeSectionId === sec.id;

              return (
                <div
                  key={ch.id}
                  id={`node-ch-${ch.id}`}
                  className={`mindmap-node chapter-node ${isSelected ? 'highlighted' : ''} ${isParentSecActive ? 'parent-active' : 'parent-inactive'}`}
                  onClick={() => onSelectChapter(ch.id)}
                >
                  {isEditing ? (
                    <div className="node-edit-form" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingNode.value}
                        onChange={(e) => setEditingNode({ ...editingNode, value: e.target.value })}
                        autoFocus
                        onBlur={handleEditSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubmit();
                          if (e.key === 'Escape') setEditingNode(null);
                        }}
                      />
                      <button onClick={handleEditSubmit} className="btn-confirm"><Check size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="node-content">
                        <span className="node-tag">{sec.title} - Ch</span>
                        <span className="node-title">{ch.title || `챕터`}</span>
                      </div>
                      <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="node-action-icon"
                          title="이름 수정"
                          onClick={() => startEditing('chapter', ch.id, ch.title)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="node-action-icon delete"
                          title="챕터 삭제"
                          onClick={() => {
                            if (confirm(`'${ch.title}' 챕터를 삭제하시겠습니까?`)) {
                              onDeleteChapter(sec.id, ch.id);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {/* Leaf Node: NO add button here */}
                    </>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};

export default MindMap;
