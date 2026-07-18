import React, { useState } from 'react';
import { Lock, User, Sparkles } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '123jesus') {
      onLogin();
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="login-container">
      <div className={`login-card ${isShaking ? 'shake' : ''}`}>
        <div className="login-header">
          <div className="logo-glow">
            <Sparkles className="logo-icon" size={32} />
          </div>
          <h1>Novel Workspace</h1>
          <p>창작자를 위한 스마트한 소설 집필 공간</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">관리자 ID</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                type="text"
                id="username"
                placeholder="ID를 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">비밀번호</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                id="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn">
            로그인 및 시작하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
