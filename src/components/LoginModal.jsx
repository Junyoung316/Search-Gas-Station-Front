import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// onLoginSuccess: 로그인이 성공했을 때 부모(App.jsx)에게 알리는 함수
// onSignupClick: "회원가입" 링크를 눌렀을 때 모달을 전환하는 함수
function LoginModal({ isOpen, onClose, onLoginSuccess, onSignupClick }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        password: ''
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      // 1. 백엔드 로그인 API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // 2. 토큰과 닉네임 받기
        const json = await response.json(); // { token: "...", nickname: "..." }

        console.log("Login Success:", json);
        
        // 3. 로컬 스토리지에 토큰 저장 (브라우저 껐다 켜도 유지)
        localStorage.setItem('atoken', json.data.token.accessdToken);
        localStorage.setItem('rtoken', json.data.token.refreshToken);
        localStorage.setItem('nickname', json.data.nickname);

        toast.success(`🎉 ${json.data.nickname}님 환영합니다!`);
        
        // 4. 부모 컴포넌트에 로그인 성공 알림 & 모달 닫기
        onLoginSuccess(json.data.nickname);
        onClose();
        setFormData({ email: '', password: '' });
      } else {
        toast.error("로그인 실패: 이메일 또는 비밀번호를 확인해주세요.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("서버 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box signup-box" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div className="modal-header-center">
          <h2>로그인</h2>
          <button className="close-icon-abs" onClick={onClose}>&times;</button>
        </div>

        {/* 아이콘 및 설명 */}
        <div className="signup-intro">
            <div className="user-icon-circle">
                <i className="fa-regular fa-user"></i>
            </div>
            <p>주유소 찾기 서비스를 이용하시려면 로그인이 필요합니다.</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="auth-form">
          
          <div className="form-group">
            <label>이메일</label>
            <input 
              type="email" name="email" 
              placeholder="user@example.com" 
              value={formData.email} onChange={handleChange} required 
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input 
              type="password" name="password" 
              placeholder="●●●●●●●●" 
              value={formData.password} onChange={handleChange} required 
            />
          </div>

          <button type="submit" className="submit-btn">로그인 하기</button>
        </form>

        <div className="modal-footer-link">
            계정이 없으신가요? 
            {/* 회원가입 링크 클릭 시 모달 전환 */}
            <a href="#" onClick={(e) => { e.preventDefault(); onSignupClick(); }}>회원가입</a>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;