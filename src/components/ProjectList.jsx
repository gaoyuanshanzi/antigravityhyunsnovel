import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, Edit2, Check, X } from 'lucide-react';

const ProjectList = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onLogout
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreateProject(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = (id) => {
    if (editTitle.trim()) {
      onRenameProject(id, editTitle.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="left-panel">
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <BookOpen className="panel-title-icon" size={20} />
          <h2>내 소설 목록</h2>
        </div>
        <button className="create-btn" onClick={() => setIsCreating(true)}>
          <Plus size={16} />
          새로 생성
        </button>
      </div>

      <div className="project-list-container">
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="new-project-form animate-slide-down">
            <input
              type="text"
              placeholder="소설 제목을 입력하세요..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              required
            />
            <div className="form-actions">
              <button type="submit" className="confirm-btn">생성</button>
              <button type="button" className="cancel-btn" onClick={() => setIsCreating(false)}>취소</button>
            </div>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <p>등록된 소설이 없습니다.</p>
            <p>'새로 생성'을 눌러 소설 쓰기를 시작해 보세요!</p>
          </div>
        ) : (
          <div className="project-items">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              const isEditing = project.id === editingId;

              return (
                <div
                  key={project.id}
                  className={`project-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isEditing && onSelectProject(project.id)}
                >
                  {isEditing ? (
                    <div className="edit-project-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(project.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button className="action-btn check" onClick={() => handleRenameSubmit(project.id)}>
                        <Check size={14} />
                      </button>
                      <button className="action-btn x" onClick={() => setEditingId(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="project-title">{project.title}</span>
                      <div className="project-item-actions">
                        <button
                          className="item-action-btn edit"
                          title="제목 변경"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(project.id);
                            setEditTitle(project.title);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="item-action-btn delete"
                          title="프로젝트 삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`'${project.title}' 프로젝트와 포함된 모든 목차/내용을 정말 삭제하시겠습니까?`)) {
                              onDeleteProject(project.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="left-panel-footer">
        <div className="admin-info">
          <div className="admin-avatar">A</div>
          <div className="admin-meta">
            <span className="admin-name">관리자 (admin)</span>
            <span className="admin-status">온라인</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default ProjectList;
