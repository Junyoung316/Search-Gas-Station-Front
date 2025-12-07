import React, { useState, useEffect } from 'react';

function FilterModal({ isOpen, onClose, onApply, initialValues }) {
  // 모달 내부에서만 쓸 임시 상태 (적용 누르기 전까지 App에 영향 X)
  const [radius, setRadius] = useState(initialValues.radius);
  const [fuelType, setFuelType] = useState(initialValues.fuelType);
  const [sortType, setSortType] = useState(initialValues.sortType);

  // 모달이 열릴 때마다 부모의 현재 설정값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setRadius(initialValues.radius);
      setFuelType(initialValues.fuelType);
      setSortType(initialValues.sortType);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleApply = () => {
    // 부모에게 변경된 값 전달
    onApply({ radius, fuelType, sortType });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>검색 옵션 설정</h2>
          <button className="close-icon" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
          {/* 1. 반경 선택 */}
          <div className="filter-group">
            <h3><i className="fa-solid fa-ruler-horizontal"></i> 검색 반경</h3>
            <select 
              className="custom-select" 
              value={radius} 
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              <option value={1000}>반경 1km</option>
              <option value={3000}>반경 3km</option>
              <option value={5000}>반경 5km</option>
            </select>
          </div>

          <hr />

          {/* 2. 유종 선택 */}
          <div className="filter-group">
            <h3><i className="fa-solid fa-gas-pump"></i> 유종 선택</h3>
            <div className="radio-group">
              {[
                { label: '휘발유', value: 'B027' },
                { label: '경유', value: 'D047' },
                { label: '고급유', value: 'B034' },
                { label: 'LPG', value: 'K015' }
              ].map((fuel) => (
                <label key={fuel.value} className="radio-label">
                  <input 
                    type="radio" 
                    name="fuelType" 
                    value={fuel.value}
                    checked={fuelType === fuel.value}
                    onChange={(e) => setFuelType(e.target.value)}
                  />
                  <span>{fuel.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr />

          {/* 3. 정렬 기준 */}
          <div className="filter-group">
            <h3><i className="fa-solid fa-sort"></i> 정렬 기준</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" name="sortType" value={1} 
                  checked={sortType === 1}
                  onChange={() => setSortType(1)}
                />
                <span>가격순</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio" name="sortType" value={2} 
                  checked={sortType === 2}
                  onChange={() => setSortType(2)}
                />
                <span>거리순</span>
              </label>
            </div>
          </div>
        </div>

        <button className="apply-btn" onClick={handleApply}>
          설정 적용하기
        </button>
      </div>
    </div>
  );
}

export default FilterModal;