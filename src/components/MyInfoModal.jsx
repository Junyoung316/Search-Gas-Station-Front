import React, { useState, useEffect, useRef } from 'react';
import { customFetch } from '../utils/api';
import { toast } from 'react-toastify';

function MyInfoModal({ isOpen, onClose, onLogout, onNicknameChange, onProfileImageChange }) {
  const [userInfo, setUserInfo] = useState(null);
  const fileInputRef = useRef(null);

  // 입력 상태들
  const [nickname, setNickname] = useState('');
  const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

  // 모달 열릴 때 내 정보 불러오기
  useEffect(() => {
    if (isOpen) {
        loadMyInfo();
        setPwData({ current: '', new: '', confirm: '' }); // 비번 입력창 초기화
    }
  }, [isOpen]);

  const loadMyInfo = () => {
    customFetch('/api/member/me')
      .then(res => {
          if (!res.ok) throw new Error("정보 로드 실패");
          return res.json();
      })
      .then(response => {
          const actualData = response.data || response;
          setUserInfo(actualData);
          setNickname(actualData.nickname);
      })
      .catch(err => console.error(err));
  };

  // 1. 프로필 이미지 변경
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        return toast.warn("이미지 파일만 업로드 가능합니다.");
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('atoken');
      
      // 1. 이미지 업로드 요청
      const res = await fetch('/api/member/profile-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        // [성공 1] 업로드 성공 메시지 출력
        toast.success("프로필 이미지가 변경되었습니다.");
        
        // [성공 2] 정보 갱신 (여기서 에러가 나도 메인 catch로 가지 않도록 별도 처리)
        // await를 쓰지 않고 Promise 체이닝으로 처리하여 메인 흐름과 분리합니다.
        customFetch('/api/member/me')
            .then(r => r.json())
            .then(response => {
                const data = response.data || response;
                
                // 캐시 방지용 쿼리 추가
                const newImageUrl = `${data.profileImageUrl}?t=${Date.now()}`;
                
                // 모달 내부 업데이트
                setUserInfo({ ...data, profileImageUrl: newImageUrl });

                // 헤더(App.jsx) 업데이트
                if (onProfileImageChange) {
                    onProfileImageChange(newImageUrl);
                }
            })
            .catch(innerErr => {
                // 정보 갱신만 실패했을 때는 조용히 로그만 남김 (사용자는 이미 성공 메시지를 봤으므로)
                console.error("이미지는 변경되었으나 정보 갱신 실패:", innerErr);
            });

      } else {
        // 업로드 자체가 실패한 경우
        const errorMsg = await res.text();
        toast.error(errorMsg || "이미지 업로드 실패");
      }
    } catch (err) {
      // 업로드 요청 자체가 실패한 경우 (네트워크 오류 등)
      console.error(err);
      toast.error("서버 통신 중 오류가 발생했습니다.");
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. 닉네임 변경 핸들러
  const handleNicknameUpdate = async () => {
    // 1. 유효성 검사 (빈 값 체크)
    if (!nickname.trim()) {
        return toast.warn("닉네임을 입력해주세요.");
    }
    
    // (선택사항) 현재 닉네임과 같으면 요청 안 보냄
    if (userInfo && nickname === userInfo.nickname) {
        return toast.info("현재 닉네임과 동일합니다.");
    }

    try {
        // 2. API 요청 (PUT)
        const response = await customFetch('/api/member/nickname', {
            method: 'PUT',
            body: JSON.stringify({ nickname: nickname })
        });

        // 3. 응답 처리
        if (response.ok) {
            // 성공 시 (200 OK)
            toast.success("닉네임이 변경되었습니다.");
            
            // 부모 컴포넌트(App.jsx) 상태 업데이트 -> 헤더 즉시 반영
            if (onNicknameChange) {
                onNicknameChange(nickname);
            }
            
            // 모달 내부 데이터 갱신
            loadMyInfo(); 
            
        } else {
            // 실패 시 (백엔드에서 예외 발생)
            // 백엔드가 보낸 "중복된 닉네임입니다." 메시지를 읽습니다.
            // const errorMsg = await response.text(); // 필요시 사용
            toast.error("닉네임 변경에 실패했습니다.");
        }
    } catch (err) {
        console.error("닉네임 변경 에러:", err);
        toast.error("서버 통신 중 오류가 발생했습니다.");
    }
  };

  // 3. 비밀번호 변경
  const handlePasswordUpdate = () => {
    if (!pwData.current || !pwData.new || !pwData.confirm) {
        return toast.warn("모든 비밀번호 필드를 입력해주세요.");
    }
    if (pwData.new !== pwData.confirm) {
        return toast.warn("새 비밀번호가 일치하지 않습니다.");
    }
    
    customFetch('/api/member/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwData.current, newPassword: pwData.new, confirmNewPassword: pwData.confirm})
    }).then(res => {
        if(res.ok) {
            toast.success("비밀번호 변경 완료! 다시 로그인해주세요.");
            onClose();
            onLogout();
        } else {
            toast.error("현재 비밀번호가 틀렸습니다.");
        }
    });
  };

  // 4. 회원 탈퇴
  const handleWithdraw = () => {
    if (window.confirm("정말로 탈퇴하시겠습니까?\n탈퇴 시 계정 복구가 불가능합니다.")) {
        customFetch('/api/member/withdraw', { method: 'DELETE' })
            .then(res => {
                if (res.ok) {
                    toast.info("회원 탈퇴가 완료되었습니다.");
                    onClose();
                    onLogout();
                }
            });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box myinfo-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <h2>내 정보 설정</h2>
            <button className="close-icon" onClick={onClose}>&times;</button>
        </div>

        {userInfo ? (
            <div className="modal-content scrollable-content">
                
                {/* 1. 프로필 이미지 */}
                <div className="profile-edit-section">
                    <div className="profile-img-wrapper" onClick={() => fileInputRef.current.click()}>
                        {userInfo.profileImageUrl ? (
                            <img src={userInfo.profileImageUrl} alt="Profile" className="profile-img" />
                        ) : (
                            <div className="profile-placeholder">{userInfo.nickname.charAt(0)}</div>
                        )}
                        <div className="edit-overlay"><i className="fa-solid fa-camera"></i></div>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                    
                    <p className="email-text">{userInfo.email}</p>
                    <p style={{fontSize:'12px', color:'#999', margin:0}}>가입일: {userInfo.joinDate}</p>
                </div>

                <hr className="divider" />

                {/* 2. 닉네임 변경 섹션 */}
                <div className="section-block">
                    <h3 className="section-title">닉네임 변경</h3>
                    <div className="input-group">
                        <input 
                            type="text" 
                            value={nickname} 
                            onChange={(e) => setNickname(e.target.value)} 
                            placeholder="새 닉네임"
                        />
                        <button onClick={handleNicknameUpdate} className="btn-secondary">변경</button>
                    </div>
                </div>

                <hr className="divider" />

                {/* 3. 비밀번호 변경 섹션 */}
                <div className="section-block">
                    <h3 className="section-title">비밀번호 변경</h3>
                    <div className="password-form-stack">
                        <input type="password" placeholder="현재 비밀번호" value={pwData.current} onChange={(e) => setPwData({...pwData, current: e.target.value})} />
                        <input type="password" placeholder="새 비밀번호" value={pwData.new} onChange={(e) => setPwData({...pwData, new: e.target.value})} />
                        <input type="password" placeholder="새 비밀번호 확인" value={pwData.confirm} onChange={(e) => setPwData({...pwData, confirm: e.target.value})} />
                        
                        {/* ★ [수정] 디자인된 비밀번호 변경 버튼 적용 */}
                        <button onClick={handlePasswordUpdate} className="btn-password-change">
                            비밀번호 변경하기
                        </button>
                    </div>
                </div>

                {/* 4. 회원 탈퇴 (맨 밑) */}
                <div className="withdraw-section">
                    <p style={{fontSize: '11px', color: '#bbb', marginBottom: '8px'}}>
                        더 이상 서비스를 이용하지 않으시나요?
                    </p>
                    
                    {/* ★ [수정] 디자인된 탈퇴 버튼 적용 */}
                    <button onClick={handleWithdraw} className="btn-withdraw">
                        회원 탈퇴
                    </button>
                </div>

            </div>
        ) : (
            <div style={{textAlign:'center', padding:'40px'}}>정보를 불러오는 중...</div>
        )}
      </div>
    </div>
  );
}

export default MyInfoModal;