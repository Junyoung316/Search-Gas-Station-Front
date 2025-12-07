import React from 'react';
import proj4 from 'proj4';

// KATEC 좌표계 정의
const katecDef = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs";

// 1. 거리 계산 함수
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; 
};

const getBrandName = (code) => {
    switch (code) {
        case 'SKE': return 'SK에너지';
        case 'GSC': return 'GS칼텍스';
        case 'HDO': return '현대오일뱅크';
        case 'SOL': return 'S-OIL';
        case 'RTO': return '알뜰주유소';
        case 'E1G': return 'E1';
        case 'SKG': return 'SK가스';
        default: return '기타';
    }
};

function Sidebar({ stations, onOpenFilter, onStationClick, activeStationId, onClearSelection, myLoc }) {
    
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
                    주변 주유소 ({stations.length})
                </h2>
                <button className="icon-btn" title="필터 설정" onClick={onOpenFilter}>
                    <i className="fa-solid fa-filter"></i>
                </button>
            </div>

            <div className="sidebar-content">
                
                {activeStationId && (
                    <div 
                        className="station-item clear-selection"
                        onClick={onClearSelection}
                        style={{textAlign: 'center', background: '#e6f7ff', cursor: 'pointer', padding: '10px', marginBottom: '10px'}}
                    >
                        <i className="fa-solid fa-map-marked-alt"></i> 전체 마커 보기
                    </div>
                )}

                {stations.length === 0 ? (
                    <div style={{padding:"20px", textAlign:"center", color:"#888"}}>
                        검색 결과가 없습니다.<br/>
                        지도를 움직이거나 검색어를 입력하세요.
                    </div>
                ) : (
                    stations.map((s, index) => {
                        // ---------------------------------------------------
                        // ★ [수정] 무조건 좌표 기반 직접 계산
                        // ---------------------------------------------------
                        let displayDistance = 0;
                        let distText = "거리 정보 없음";

                        // 내 위치와 주유소 좌표가 모두 있을 때만 계산
                        if (myLoc && myLoc.lat && s.GIS_X_COOR && s.GIS_Y_COOR) {
                            try {
                                const katecX = parseFloat(s.GIS_X_COOR);
                                const katecY = parseFloat(s.GIS_Y_COOR);

                                if (!isNaN(katecX) && !isNaN(katecY)) {
                                    // 1. KATEC -> WGS84 변환
                                    const [lng, lat] = proj4(katecDef, "WGS84", [katecX, katecY]);
                                    
                                    // 2. 거리 계산
                                    displayDistance = calculateDistance(myLoc.lat, myLoc.lng, lat, lng);
                                    
                                    // 디버깅 로그 (첫 번째 항목만)
                                    if (index === 0) console.log(`거리 계산: ${Math.round(displayDistance)}m`);
                                }
                            } catch (e) {
                                console.warn("좌표 변환 실패:", e);
                            }
                        }

                        // 텍스트 포맷팅
                        if (displayDistance > 0) {
                            distText = displayDistance < 1000 
                                ? `${Math.round(displayDistance)}m` 
                                : `${(displayDistance / 1000).toFixed(1)}km`;
                        }

                        // 가격 정보 확인
                        const hasPrice = s.PRICE && s.PRICE > 0;

                        return (
                            <div 
                                key={s.UNI_ID} 
                                className={`station-item ${s.UNI_ID === activeStationId ? 'active' : ''}`} 
                                onClick={() => onStationClick(s)} 
                            >
                                <div className="item-header-row">
                                    <span className={`station-brand-tag brand-${s.POLL_DIV_CD}`}>
                                        {getBrandName(s.POLL_DIV_CD)}
                                    </span>
                                    
                                    {hasPrice ? (
                                        <span className="station-price-large">{s.PRICE}원</span>
                                    ) : (
                                        <span style={{fontSize:'12px', color:'#999', display:'flex', alignItems:'center'}}>
                                            가격 상세보기 <i className="fa-solid fa-chevron-right" style={{marginLeft:'5px', fontSize:'10px'}}></i>
                                        </span>
                                    )}
                                </div>

                                <span className="station-name-lg">{s.OS_NM}</span>
                                
                                <div className="item-footer-row" style={{marginBottom: 0}}>
                                    <span className="station-distance-icon">
                                        <i className="fa-solid fa-location-dot" style={{marginRight:'5px'}}></i> 
                                        {distText}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
export default Sidebar;