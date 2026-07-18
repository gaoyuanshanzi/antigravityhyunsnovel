import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { importFromHtml } from '../utils/importer';

const ImportModal = ({ onImport, onClose }) => {
  const [titleInput, setTitleInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;
    setError('');
    setParsedData(null);

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['html', 'htm'].includes(ext)) {
      setError('HTML 파일만 가져올 수 있습니다.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = importFromHtml(content, titleInput || '');
        setParsedData(parsed);
        if (!titleInput && parsed.title) setTitleInput(parsed.title);
      } catch (err) {
        setError('파일을 파싱하는 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleConfirm = () => {
    if (!parsedData) return;
    const finalData = { ...parsedData, title: titleInput.trim() || parsedData.title };
    onImport(finalData);
  };

  const totalChapters = parsedData?.sections.reduce((s, sec) => s + sec.chapters.length, 0) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-scale-up import-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <Upload className="modal-icon" size={24} />
          <div>
            <h3>소설 가져오기 (Import)</h3>
            <p>이 서비스에서 내보낸 HTML 파일을 가져옵니다.</p>
          </div>
          <button className="modal-close-x" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Title Input */}
        <div className="import-field-group">
          <label className="import-field-label">소설 제목</label>
          <input
            className="import-field-input"
            type="text"
            placeholder="소설 제목 입력 (파일에서 자동 추출됩니다)"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
          />
        </div>

        {/* Drop Zone */}
        <div
          className={`import-dropzone ${dragOver ? 'drag-over' : ''} ${parsedData ? 'uploaded' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            style={{ display: 'none' }}
            onChange={(e) => processFile(e.target.files[0])}
          />
          {parsedData ? (
            <>
              <CheckCircle size={36} color="#10b981" />
              <p className="dropzone-filename">{fileName}</p>
              <span className="dropzone-hint">다른 파일을 선택하려면 클릭하세요</span>
            </>
          ) : (
            <>
              <Upload size={36} color="#9ca3af" />
              <p className="dropzone-prompt">파일을 드래그하거나 클릭하여 선택</p>
              <span className="dropzone-hint">.html 파일 지원</span>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="import-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Preview */}
        {parsedData && (
          <div className="import-preview-box">
            <p className="preview-title">파싱 결과</p>
            <div className="preview-stats">
              <div className="preview-stat-item">
                <span className="preview-stat-label">제목</span>
                <span className="preview-stat-value">{titleInput || parsedData.title}</span>
              </div>
              <div className="preview-stat-item">
                <span className="preview-stat-label">섹션</span>
                <span className="preview-stat-value">{parsedData.sections.length}개</span>
              </div>
              <div className="preview-stat-item">
                <span className="preview-stat-label">챕터</span>
                <span className="preview-stat-value">{totalChapters}개</span>
              </div>
            </div>
            {parsedData.sections.length > 0 && (
              <div className="preview-structure">
                {parsedData.sections.slice(0, 3).map((sec, i) => (
                  <div key={i} className="preview-section-row">
                    <FileText size={12} />
                    <span>{sec.title} ({sec.chapters.length}챕터)</span>
                  </div>
                ))}
                {parsedData.sections.length > 3 && (
                  <div className="preview-section-row muted">
                    <span>+{parsedData.sections.length - 3}개 섹션 더...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>취소</button>
          {parsedData && (
            <button className="import-confirm-btn" onClick={handleConfirm}>
              <Upload size={15} />
              소설 가져오기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
