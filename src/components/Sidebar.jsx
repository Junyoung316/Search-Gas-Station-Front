import React, { useState } from 'react'; // useState 추가
import { customFetch } from '../utils/api';
import { toast } from 'react-toastify';
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
    
    // ★ 찜한 주유소 ID들을 저장하는 Set (빠른 조회를 위해 Set 사용)
    const [favorites, setFavorites] = useState(new Set());

    // ★ 찜 토글 핸들러
    const handleToggleFavorite = async (e, station) => {
    // 1. 이벤트 전파 방지 (지도 이동 방지 & 폼 제출 방지)
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('atoken'); 
        
    if (!token) {
        // 토큰이 없으면 비로그인 상태이므로 바로 경고창 띄우고 함수 종료
        if (typeof toast !== 'undefined') {
            const event = new CustomEvent('open-login-modal', { 
                detail: { message: "로그인이 필요한 서비스입니다." } 
            });
            window.dispatchEvent(event);
        } else {
            const event = new CustomEvent('open-login-modal', { 
                detail: { message: "로그인이 필요한 서비스입니다." } 
            });
            window.dispatchEvent(event);
        }
        return; // 여기서 강제 종료! 서버 요청 안 함.
    }



    // 2. 백엔드로 보낼 데이터 준비
    const payload = {
        stationCode: station.UNI_ID,
        name: station.OS_NM,
        brand: station.POLL_DIV_CD,
        address: station.NEW_ADR || station.ADDR
    };

    try {
        // 3. customFetch 호출 (await 필수)
        // 경로는 백엔드 Controller 설정에 맞춰 확인해주세요. (/toggle 또는 /gas-station)
        const response = await customFetch('/api/favorites/gas-station', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // 4. 응답 상태 코드 확인
        if (response.ok) {
            const json = await response.json(); // JSON 데이터 파싱

            console.log("찜하기 응답 데이터:", json);

            // 5. UI 상태(하트 색상) 업데이트
            setFavorites(prev => {
                const newFavs = new Set(prev);
                
                // 백엔드 응답이 { favorited: true } 또는 { status: true } 라고 가정
                if (json.status == 200) { 
                    newFavs.add(station.UNI_ID);
                    // (선택) 찜 등록 성공 메시지
                    // toast.success("단골 주유소로 등록되었습니다."); 
                } else {
                    newFavs.delete(station.UNI_ID);
                    // (선택) 찜 해제 성공 메시지
                    // toast.info("단골 주유소에서 해제되었습니다."); 
                }
                return newFavs;
            });

        } else {
            // 그 외 에러
            if (typeof toast !== 'undefined') {
                toast.error("오류가 발생했습니다.");
            } else {
                alert("오류가 발생했습니다.");
            }
        }
    } catch (error) {
        console.error("찜하기 통신 오류:", error);
    }
};

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
                        let displayDistance = 0;
                        let distText = "거리 정보 없음";

                        if (myLoc && myLoc.lat && s.GIS_X_COOR && s.GIS_Y_COOR) {
                            try {
                                const katecX = parseFloat(s.GIS_X_COOR);
                                const katecY = parseFloat(s.GIS_Y_COOR);

                                if (!isNaN(katecX) && !isNaN(katecY)) {
                                    const [lng, lat] = proj4(katecDef, "WGS84", [katecX, katecY]);
                                    displayDistance = calculateDistance(myLoc.lat, myLoc.lng, lat, lng);
                                }
                            } catch (e) {
                                console.warn("좌표 변환 실패:", e);
                            }
                        }

                        if (displayDistance > 0) {
                            distText = displayDistance < 1000 
                                ? `${Math.round(displayDistance)}m` 
                                : `${(displayDistance / 1000).toFixed(1)}km`;
                        }

                        const hasPrice = s.PRICE && s.PRICE > 0;
                        // ★ 현재 이 주유소가 찜 목록에 있는지 확인
                        const isFavorited = favorites.has(s.UNI_ID);

                        return (
                            <div 
                                key={s.UNI_ID} 
                                className={`station-item ${s.UNI_ID === activeStationId ? 'active' : ''}`} 
                                onClick={() => onStationClick(s)} 
                                style={{position: 'relative'}} // 하트 버튼 위치 잡기 위해 relative 추가
                            >
                                <div className="item-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    
                                    {/* 왼쪽: 브랜드 태그 + 이름 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <span className={`station-brand-tag brand-${s.POLL_DIV_CD}`}>
                                            {getBrandName(s.POLL_DIV_CD)}
                                        </span>
                                        <span className="station-name-lg" style={{fontSize: '16px', fontWeight: 'bold'}}>
                                            {s.OS_NM}
                                        </span>
                                    </div>

                                    {/* ★ 오른쪽: 찜 버튼 추가 */}
                                    <button 
                                        className="btn-favorite"
                                        type='button'
                                        onClick={(e) => handleToggleFavorite(e, s)}
                                        title={isFavorited ? "찜 해제" : "찜하기"}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '5px',
                                            fontSize: '18px',
                                            color: isFavorited ? '#ff4757' : '#ccc', // 찜하면 빨간색, 아니면 회색
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        <i className={isFavorited ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                    </button>
                                </div>

                                {/* 가격 표시 영역 */}
                                <div style={{ marginTop: '5px' }}>
                                    {hasPrice ? (
                                        <span className="station-price-large">{s.PRICE}원</span>
                                    ) : (
                                        <span style={{fontSize:'12px', color:'#999', display:'flex', alignItems:'center'}}>
                                            가격 상세보기 <i className="fa-solid fa-chevron-right" style={{marginLeft:'5px', fontSize:'10px'}}></i>
                                        </span>
                                    )}
                                </div>
                                
                                <div className="item-footer-row" style={{marginBottom: 0, marginTop: '8px'}}>
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