import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { customFetch } from '../utils/api';

function SettingsModal({ isOpen, onClose, onUpdateSettings }) {
  const [loading, setLoading] = useState(false);
  
  // 설정 상태 관리
  const [settings, setSettings] = useState({
    fuelType: 'B027', // 기본: 휘발유
    radius: 3000,     // 기본: 3km
    sortType: 1       // 기본: 가격순
  });

  // 모달 열릴 때: 내 설정 가져오기 (GET)
  useEffect(() => {
    if (isOpen) {
        console.log("⚙️ 설정 모달 열림: 사용자 설정 불러오는 중...");
      const token = localStorage.getItem('atoken');
      if (!token) return;

      setLoading(true);
      customFetch('/api/my/settings')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("설정을 불러오는데 실패했습니다.");
      })
      .then(json => {
        // 서버에 저장된 값이 있으면 덮어씌움
        if (json) {
            setSettings({
                fuelType: json.data.fuelType,
                radius: json.data.radius, // DTO 필드명 확인 필요
                sortType: json.data.sortType
            });
        }
      })
      .catch(err => {
        // console.error(err); // 조용히 실패 (기본값 사용)
      })
      .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    // 숫자로 변환해야 하는 필드 처리
    const finalValue = (name === 'radius' || name === 'sortType') ? Number(value) : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  // 저장 버튼 클릭: 설정 저장하기 (PUT)
  const handleSave = () => {
    const token = localStorage.getItem('atoken');
    if (!token) {
        toast.error("로그인이 필요합니다.");
        return;
    }

    // 로딩 표시
    const saveBtn = document.getElementById('save-settings-btn');
    if(saveBtn) saveBtn.disabled = true;

    customFetch('/api/settings',{
      // 백엔드 DTO 필드명에 맞춰서 전송
      method: 'POST',
      body: JSON.stringify({
          fuelType: settings.fuelType,
          radius: settings.radius,
          sortType: settings.sortType
      })
    })
    .then(res => {
      if (res.ok) {
        toast.success("설정이 저장되었습니다!");
        
        // ★ 앱 전체에 즉시 반영 (선택사항)
        if (onUpdateSettings) {
            onUpdateSettings(settings);
        }
        
        onClose();
      } else {
        toast.error("저장에 실패했습니다.");
      }
    })
    .catch(() => toast.error("서버 오류가 발생했습니다."))
    .finally(() => {
        if(saveBtn) saveBtn.disabled = false;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box settings-box" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div className="modal-header">
          <h2>환경 설정</h2>
          <button className="close-icon" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
            <p className="settings-desc">
                자주 사용하는 검색 조건을 저장해두세요.<br/>
                로그인 시 자동으로 적용됩니다.
            </p>

            {loading ? (
                <div style={{textAlign:'center', padding:'20px'}}>설정 불러오는 중...</div>
            ) : (
                <>
                    {/* 1. 선호 유종 설정 */}
                    <div className="settings-group">
                        <h3><i className="fa-solid fa-gas-pump"></i> 선호 유종</h3>
                        <div className="radio-options-grid">
                            {[
                                { label: '휘발유', value: 'B027' },
                                { label: '경유', value: 'D047' },
                                { label: '고급유', value: 'B034' },
                                { label: 'LPG', value: 'K015' }
                            ].map((option) => (
                                <label key={option.value} className={`radio-box ${settings.fuelType === option.value ? 'selected' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="fuelType" 
                                        value={option.value}
                                        checked={settings.fuelType === option.value}
                                        onChange={handleChange}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 2. 기본 검색 반경 */}
                    <div className="settings-group">
                        <h3><i className="fa-solid fa-ruler-horizontal"></i> 기본 검색 반경</h3>
                        <select 
                            name="radius" 
                            className="custom-select"
                            value={settings.radius}
                            onChange={handleChange}
                        >
                            <option value={1000}>반경 1km</option>
                            <option value={3000}>반경 3km</option>
                            <option value={5000}>반경 5km</option>
                        </select>
                    </div>

                    {/* 3. 정렬 기준 */}
                    <div className="settings-group">
                        <h3><i className="fa-solid fa-arrow-down-short-wide"></i> 우선 정렬</h3>
                        <div className="toggle-switch-container">
                            <label className={`toggle-option ${settings.sortType === 1 ? 'active' : ''}`}>
                                <input 
                                    type="radio" name="sortType" value={1} 
                                    checked={settings.sortType === 1} onChange={handleChange} 
                                />
                                가격순
                            </label>
                            <label className={`toggle-option ${settings.sortType === 2 ? 'active' : ''}`}>
                                <input 
                                    type="radio" name="sortType" value={2} 
                                    checked={settings.sortType === 2} onChange={handleChange} 
                                />
                                거리순
                            </label>
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* 푸터 버튼 */}
        <div className="modal-footer">
            <button className="cancel-btn" onClick={onClose}>취소</button>
            <button id="save-settings-btn" className="save-btn" onClick={handleSave}>
                설정 저장하기
            </button>
        </div>

      </div>
    </div>
  );
}

export default SettingsModal;