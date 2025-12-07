import React, { useState, useEffect } from 'react';
import { customFetch } from '../utils/api';

// -------------------------------------------------------------------
// 1. [Constants and Helpers]
// -------------------------------------------------------------------
const iconStyle = { marginRight: '5px', fontSize: '14px' };

const getFuelName = (code) => {
    switch (code) {
        case 'B027': return '휘발유';
        case 'D047': return '경유';
        case 'B034': return '고급휘발유';
        case 'C004': return '실내등유';
        case 'K015': return 'LPG';
        default: return code;
    }
};

// 부가 서비스 플래그를 아이콘과 함께 렌더링하는 헬퍼 함수
const renderServiceStatus = (yn, icon, label) => {
    // null 또는 undefined도 'N'과 동일하게 false로 처리 (안전성 확보)
    const isAvailable = yn === 'Y'; 
    
    return (
        <span 
            key={label}
            style={{ 
                color: isAvailable ? '#1890ff' : '#aaa', 
                marginRight: '15px', 
                fontWeight: isAvailable ? 'bold' : 'normal' 
            }}
        >
            <i className={`fa-solid fa-${icon}`} style={iconStyle}></i> {label}
        </span>
    );
};

// 선택된 유종의 가격만 찾아오는 헬퍼 함수
const getSelectedFuelPrice = (detailObj, fuelType) => {
    if (!detailObj || !detailObj.OIL_PRICE) {
        console.warn("⚠️ 가격 조회 실패: OIL_PRICE 배열이 비어있습니다.");
        return null;
    }
    
    // ⭐️ [진단 로그] 비교 대상인 두 값을 콘솔에 출력 ⭐️
    const availableCodes = detailObj.OIL_PRICE.map(p => p.PRODCD);
    console.log("💰 Target Fuel:", fuelType);
    console.log("💰 Available Codes:", availableCodes);

    // DTO 필드명(productCode)으로 접근
    const priceInfo = detailObj.OIL_PRICE.find(p => p.PRODCD === fuelType); 

    if (!priceInfo) {
        console.warn(`❌ 일치하는 유종 코드(${fuelType})를 찾지 못했습니다.`);
        return null;
    }
    
    // 가격을 찾았으므로 정상 반환
    return priceInfo.PRICE;
};


function StationDetailModal({ isOpen, onClose, uniId, currentFilters }) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------------
  // 2. [Data Fetching and State Update]
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || !uniId) {
      setDetail(null);
      return;
    }
    
    setIsLoading(true);
    setDetail(null); 

    customFetch(`/api/station-detail?uniId=${uniId}`)
      .then(res => res.json())
      .then(data => {
        
        // ⭐️ [최종 FIX] DTO 필드명(stationDetails) 또는 원본 Opinet 필드명(OIL) 둘 중 하나를 시도합니다.
        const stationArray = data?.result?.stationDetails || data?.RESULT?.OIL;

        if (stationArray?.length > 0) {
          // 데이터를 성공적으로 찾았으므로 detail 상태 설정
          setDetail(stationArray[0]); 
          console.log('✅ 상세 정보 설정 성공!'); 
        } else {
          console.warn("API에서 유효한 상세 정보 배열을 찾지 못했습니다. UNI_ID:", uniId);
          setDetail({}); 
        }
      })
      .catch(err => {
        console.error("상세 정보 처리 중 에러 발생:", err);
        setDetail({});
      })
      .finally(() => setIsLoading(false));

  }, [isOpen, uniId]); 

  if (!isOpen) return null;

  // 3. [Render Variables]
  const currentPrice = getSelectedFuelPrice(detail, currentFilters.fuelType);
  const serviceDetail = detail || {}; // 안전한 참조를 위한 기본 객체 설정

  const prices = serviceDetail.OIL_PRICE ? [...serviceDetail.OIL_PRICE] : [];
  
  const sortedPrices = prices.sort((a, b) => {
    // 현재 필터에서 선택된 유종 코드
    const targetFuel = currentFilters.fuelType;

    // a가 선택된 유종이면 무조건 앞으로 (-1)
    if (a.PRODCD === targetFuel) return -1; 
    
    // b가 선택된 유종이면 뒤로 (1), 하지만 정렬 로직이 b를 a 앞으로 보냄
    if (b.PRODCD === targetFuel) return 1;  
    
    // 나머지 항목은 순서 유지
    return 0; 
  });

  // -------------------------------------------------------------
  // 🚨 [최종 진단 로그] 렌더링 직전 데이터 상태 확인
  // -------------------------------------------------------------
  console.log('--- RENDER STATE DIAGNOSIS ---');
  console.log('1. Data Ready (check):', !!detail && Object.keys(detail).length > 0);
  console.log('2. Station Name:', serviceDetail.OS_NM);
  console.log('3. Address Check:', serviceDetail.NEW_ADR);
  console.log('4. Price Value:', currentPrice);
  console.log('5. Wash YN Check (Correct DTO field):', serviceDetail.WASH_YN);
  console.log('------------------------------');

  // 4. [JSX Return Logic]
  return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: '550px' }}>
                
                {/* 헤더 */}
                <div className="modal-header">
                    <h2>{serviceDetail.OS_NM || '주유소 상세 정보'}</h2> 
                    <button className="close-icon" onClick={onClose}>&times;</button>
                </div>

                {isLoading ? (
                    <div style={{textAlign: 'center', padding: '30px'}}>상세 정보 로딩 중...</div>
                ) : !detail || Object.keys(detail).length === 0 ? ( 
                    <div style={{textAlign: 'center', padding: '30px'}}>상세 정보를 찾을 수 없습니다.</div>
                ) : (
                    <div className="modal-content-detail">
                        
                        {/* 1. [가격 강조 섹션] 현재 필터 유종의 가격을 크게 표시 */}
                        <div className="price-focus-section">
                            <p className="price-label">선택 유종 가격 ({getFuelName(currentFilters.fuelType)})</p>
                            <p className="price-value-lg">
                                {currentPrice ? `${currentPrice} 원` : '가격 정보 없음'}
                            </p>
                        </div>

                        {/* 2. [모든 유종 가격 리스트] - Grid Layout */}
                        <div className="detail-section price-grid-container">
                        <h3 className="section-title">모든 유종 가격 현황</h3>
                        <div className="price-grid">
                            {/* ⭐️ [수정] 정렬된 배열(sortedPrices)을 사용합니다. ⭐️ */}
                            {sortedPrices.map((oil) => (
                                <div 
                                    key={oil.PRODCD} 
                                    className={`price-card ${oil.PRODCD === currentFilters.fuelType ? 'is-highlighted' : ''}`}
                                >
                                    {/* ⭐️ [수정] getFuelName 헬퍼 함수 사용 ⭐️ */}
                                    <p className="fuel-name">{getFuelName(oil.PRODCD)}</p>
                                    <p className="fuel-price">{oil.PRICE}원</p>
                                    <p className="fuel-date">기준: {oil.TRADE_DT}</p>
                                </div>
                            ))}
                        </div>
                        </div>
                        
                        {/* 3. [부가 서비스] - Icons */}
                        <div className="detail-section service-icons">
                            <h3 className="section-title">부가 서비스 및 편의시설</h3>
                            <div className="service-list">
                                {renderServiceStatus(serviceDetail.WASH_YN, 'car-wash', '자동세차')}
                                {renderServiceStatus(serviceDetail.CONV_YN, 'store', '편의점')}
                                {renderServiceStatus(serviceDetail.MAINT_YN, 'wrench', '경정비')}
                                {renderServiceStatus(serviceDetail.LPG_YN, 'propane-tank', 'LPG 충전')}
                            </div>
                        </div>

                        {/* 4. [주소 및 연락처] */}
                        <div className="detail-section address-info">
                            <h3 className="section-title">위치 및 연락처</h3>
                            <p className="address-text">
                                <i className="fa-solid fa-map-pin" style={iconStyle}></i> 
                                <span>{serviceDetail.NEW_ADR || '주소 정보 없음'}</span>
                            </p>
                            <p className="tel-text">
                                <i className="fa-solid fa-phone" style={iconStyle}></i> 
                                <span>{serviceDetail.TEL || '정보 없음'}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StationDetailModal;