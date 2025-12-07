import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function SignupModal({ isOpen, onClose, onLoginClick }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', // 비밀번호 확인 필드 추가 (UX용)
    nickname: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        nickname: ''
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
        alert("비밀번호가 일치하지 않습니다."); // TODO: 실시간으로 비밀번호 일치 여부 체크
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            checkPassword: formData.confirmPassword,
            nickname: formData.nickname
        }),
      });

      if (response.ok) {
        toast.success("회원가입이 완료되었습니다! 로그인해주세요.");
        onClose();
        setFormData({ email: '', password: '', confirmPassword: '', nickname: '' });
      } else {
        const errorMsg = await response.text();
        toast.error(`회원가입 실패: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      toast.error("서버 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box signup-box" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div className="modal-header-center">
          <h2>회원가입</h2>
          <button className="close-icon-abs" onClick={onClose}>&times;</button>
        </div>

        {/* 아이콘 및 설명 */}
        <div className="signup-intro">
            <div className="user-icon-circle">
                <i className="fa-regular fa-user"></i>
            </div>
            <p>회원가입하고 나만의 주유소를 관리하세요.</p>
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

          <div className="form-group">
            <label>비밀번호 확인</label>
            <input 
              type="password" name="confirmPassword" 
              placeholder="●●●●●●●●" 
              value={formData.confirmPassword} onChange={handleChange} required 
            />
          </div>

          <div className="form-group">
            <label>닉네임</label>
            <input 
              type="text" name="nickname" 
              placeholder="별명 입력" 
              value={formData.nickname} onChange={handleChange} required 
            />
          </div>

          <button type="submit" className="submit-btn">가입하기</button>
        </form>

        <div className="modal-footer-link">
            이미 계정이 있으신가요? <a href="#" onClick={(e) => { 
                e.preventDefault(); // 링크 기본 동작(페이지 점프) 막기
                onLoginClick();     // 부모에게 알림
            }}>
                로그인</a>
        </div>
      </div>
    </div>
  );
}

export default SignupModal;