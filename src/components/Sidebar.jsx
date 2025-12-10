import React, { useState, useEffect } from 'react';
import { customFetch } from '../utils/api';
import { toast } from 'react-toastify';
import proj4 from 'proj4';

// KATEC 좌표계 정의
const katecDef = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs";

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

// 유종 코드 매핑
const PRODUCT_NAMES = {
    'B027': '휘발유',
    'D047': '경유',
    'K015': 'LPG',
    'C004': '등유',
    'B034': '고급휘발유'
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

function Sidebar({ stations, onOpenFilter, onStationClick, activeStationId, onClearSelection, myLoc, onMapUpdate }) {
    
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'favorites'
    const [favorites, setFavorites] = useState(new Set()); // 하트 표시용 ID 집합
    const [favoriteStations, setFavoriteStations] = useState([]); // 찜 탭 표시용 상세 데이터 리스트
    const [isLoadingFavs, setIsLoadingFavs] = useState(false); // 로딩 상태

    // 1. 단골 주유소 데이터 가져오기 (ID 목록 -> 상세 정보 Loop 요청)
    const fetchFavoriteDetails = async () => {
        const token = localStorage.getItem('atoken');
        if (!token) return;

        setIsLoadingFavs(true);
        try {
            // (1) 찜 목록 ID 가져오기
            const idRes = await customFetch('/api/favorites/gas-station', { method: 'GET' });
            if (!idRes.ok) throw new Error("찜 목록 조회 실패");
            
            const idJson = await idRes.json();
            let idList = [];
            if (idJson.data && Array.isArray(idJson.data)) {
                 idList = idJson.data.map(item => (typeof item === 'object' ? item.stationCode || item.UNI_ID : item));
            }
            setFavorites(new Set(idList));

            // (2) 상세 정보 요청
            const detailPromises = idList.map(async (id) => {
                try {
                    // ★ 파라미터명 확인 (code 또는 unild)
                    const detailRes = await customFetch(`/api/station-detail?uniId=${id}`, { method: 'GET' });
                    
                    if (detailRes.ok) {
                        const detailJson = await detailRes.json();
                        
                        // ▼▼▼ [수정됨] JSON 구조(RESULT > OIL)에 맞게 데이터 추출 ▼▼▼
                        let result = null;

                        // Case 1: Opinet 상세 조회 구조 (제공해주신 JSON)
                        if (detailJson.RESULT && detailJson.RESULT.OIL && Array.isArray(detailJson.RESULT.OIL)) {
                            result = detailJson.RESULT.OIL[0];
                        } 
                        // Case 2: 백엔드가 이미 가공해서 보낸 경우 (기존 대비용)
                        else if (detailJson.data) {
                            result = Array.isArray(detailJson.data) ? detailJson.data[0] : detailJson.data;
                        }

                        // 유효한 데이터가 있으면 반환
                        if (result) return result;
                    }
                } catch (err) {
                    console.error(`ID ${id} 상세 조회 실패`, err);
                }
                return null;
            });

            const results = await Promise.all(detailPromises);
            const validStations = results.filter(s => s !== null);
            setFavoriteStations(validStations);

        } catch (error) {
            console.error("단골 주유소 로딩 중 오류:", error);
        } finally {
            setIsLoadingFavs(false);
        }
    };

    // 초기 로드 시 및 탭 변경 시 데이터 로드
    useEffect(() => {
        // 처음 로드될 때 하트 상태를 알기 위해 실행
        fetchFavoriteDetails();
    }, []);

    // 2. 탭이 바뀌거나 데이터가 바뀌면 지도 업데이트 (부모에게 알림)
    useEffect(() => {
        if (!onMapUpdate) return;

        let targetList = activeTab === 'search' ? stations : favoriteStations;

        // 지도 마커용 데이터 변환 (좌표계 통일)
        const mapData = targetList.map(s => {
            let lat = s.latitude || s.lat; 
            let lng = s.longitude || s.lng;

            // KATEC 좌표가 있으면 변환 (Opinet 데이터)
            if (!lat && s.GIS_X_COOR && s.GIS_Y_COOR) {
                try {
                    const [convertedLng, convertedLat] = proj4(katecDef, "WGS84", [parseFloat(s.GIS_X_COOR), parseFloat(s.GIS_Y_COOR)]);
                    lat = convertedLat;
                    lng = convertedLng;
                } catch (e) {}
            }

            return {
                ...s,
                lat: lat,
                lng: lng,
                id: s.UNI_ID || s.stationCode
            };
        });

        onMapUpdate(mapData);

    }, [activeTab, stations, favoriteStations, onMapUpdate]);

    // 3. 찜 토글 핸들러 (단순화 버전)
    const handleToggleFavorite = async (e, station) => {
        e.preventDefault();
        e.stopPropagation();

        const token = localStorage.getItem('atoken'); 
        if (!token) {
            window.dispatchEvent(new CustomEvent('open-login-modal', { detail: { message: "로그인이 필요합니다." } }));
            return;
        }

        // 주유소 ID 추출 (Opinet 원본: UNI_ID, 상세조회결과: stationCode 등)
        const id = station.UNI_ID || station.stationCode;
        
        // ★ [변경됨] 백엔드에는 "이 ID를 찜해줘"라고 ID만 보냄
        const payload = {
            stationCode: id
        };

        try {
            // POST /api/favorites/gas-station
            const response = await customFetch('/api/favorites/gas-station', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const json = await response.json();
                
                // 성공 시 UI 즉시 업데이트
                if (json.status == 200) {
                    // (1) 하트 빨갛게 칠하기
                    setFavorites(prev => new Set(prev).add(id));
                    
                    // (2) '단골 주유소' 탭 리스트에도 추가
                    // 상세 정보 API를 다시 부르기엔 비효율적이므로, 현재 클릭한 정보를 임시로 넣어둠
                    // (단, 좌표 변환은 화면 표시용으로 필요하다면 여기서만 수행하거나, 나중에 탭 누를때 새로고침됨)
                    setFavoriteStations(prev => [...prev, station]); 
                    
                } else {
                    // (1) 하트 끄기
                    setFavorites(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    
                    // (2) '단골 주유소' 탭 리스트에서 제거
                    setFavoriteStations(prev => prev.filter(s => (s.UNI_ID || s.stationCode) !== id));
                }
            } else {
                 if (typeof toast !== 'undefined') toast.error("요청 처리에 실패했습니다.");
            }
        } catch (error) {
            console.error("찜하기 통신 오류", error);
        }
    };

    const getDisplayPrice = (station) => {
    // 1. 이미 최상위에 PRICE가 있는 경우 (검색 결과)
    if (station.PRICE) return station.PRICE;

    // 2. 상세 조회 결과 (OIL_PRICE 배열이 있는 경우)
    if (station.OIL_PRICE && Array.isArray(station.OIL_PRICE)) {
        // 우선순위: 휘발유(B027) -> 경유(D047) -> LPG(K015) -> 아무거나 0보다 큰 것
        const targetCodes = ['B027', 'D047', 'K015'];
        
        for (const code of targetCodes) {
            const product = station.OIL_PRICE.find(p => p.PRODCD === code);
            if (product && product.PRICE > 0) return product.PRICE;
        }

        // 그래도 없으면 0보다 큰 첫 번째 가격 반환
        const anyPrice = station.OIL_PRICE.find(p => p.PRICE > 0);
        if (anyPrice) return anyPrice.PRICE;
    }

    return 0; // 가격 정보 없음
};

    const displayList = activeTab === 'search' ? stations : favoriteStations;

    return (
        <div className="sidebar">
            <div className="sidebar-header-wrapper" style={{padding: '15px 15px 0 15px', borderBottom: '1px solid #eee'}}>
                <div className="sidebar-header" style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>주유소 찾기</h2>
                    {activeTab === 'search' && (
                        <button className="icon-btn" onClick={onOpenFilter}><i className="fa-solid fa-filter"></i></button>
                    )}
                </div>
                
                {/* 탭 버튼 */}
                <div className="sidebar-tabs" style={{display: 'flex', gap: '10px'}}>
                    <button 
                        onClick={() => setActiveTab('search')}
                        style={{
                            flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'search' ? '2px solid #333' : '2px solid transparent',
                            fontWeight: activeTab === 'search' ? 'bold' : 'normal',
                            color: activeTab === 'search' ? '#333' : '#999'
                        }}
                    >
                        검색 결과 ({stations.length})
                    </button>
                    <button 
                        onClick={() => { setActiveTab('favorites'); fetchFavoriteDetails(); }} // 탭 클릭 시 최신 정보 갱신
                        style={{
                            flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'favorites' ? '2px solid #ff4757' : '2px solid transparent',
                            fontWeight: activeTab === 'favorites' ? 'bold' : 'normal',
                            color: activeTab === 'favorites' ? '#ff4757' : '#999'
                        }}
                    >
                        단골 주유소 ({favorites.size})
                    </button>
                </div>
            </div>

            <div className="sidebar-content">
                {isLoadingFavs && activeTab === 'favorites' ? (
                    <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>
                        <i className="fa-solid fa-spinner fa-spin" style={{fontSize: '24px', marginBottom: '10px'}}></i>
                        <br/>단골 주유소 정보를 불러오는 중...
                    </div>
                ) : (
                    <>
                        {activeTab === 'search' && activeStationId && (
                            <div className="station-item clear-selection" onClick={onClearSelection} style={{textAlign: 'center', background: '#e6f7ff', cursor: 'pointer', padding: '10px', marginBottom: '10px'}}>
                                <i className="fa-solid fa-map-marked-alt"></i> 전체 마커 보기
                            </div>
                        )}

                        {displayList.length === 0 ? (
                            <div style={{padding:"40px 20px", textAlign:"center", color:"#888"}}>
                                {activeTab === 'search' ? "검색 결과가 없습니다." : "단골 주유소가 없습니다."}
                            </div>
                        ) : (
                            displayList.map((s, index) => {
                                // 데이터 필드 정규화
                                const id = s.UNI_ID || s.stationCode;
                                const name = s.OS_NM || s.name || s.stationName; // API 응답 필드명 확인 필요
                                const brand = s.POLL_DIV_CD || s.POLL_DIV_CO || s.brand;
                                
                                let priceList = [];
                                if (s.OIL_PRICE && Array.isArray(s.OIL_PRICE)) {
                                    priceList = s.OIL_PRICE
                                        .filter(p => p.PRICE > 0) // 가격이 0인 것은 제외
                                        .map(p => ({
                                            code: p.PRODCD,
                                            name: PRODUCT_NAMES[p.PRODCD] || p.PRODCD,
                                            price: p.PRICE
                                        }));
                                    
                                    // 순서 정렬 (고급휘발유 -> 휘발유 -> 경유 -> LPG -> 등유 순)
                                    const order = ['B034', 'B027', 'D047', 'K015', 'C004'];
                                    priceList.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
                                }

                                // (2) 단일 가격 (검색 탭용 fallback)
                                const singlePrice = s.PRICE || 0;
                                
                                let distText = "";
                                if (myLoc && myLoc.lat) {
                                    if (s.GIS_X_COOR && s.GIS_Y_COOR) {
                                        try {
                                            const [lng, lat] = proj4(katecDef, "WGS84", [parseFloat(s.GIS_X_COOR), parseFloat(s.GIS_Y_COOR)]);
                                            const d = calculateDistance(myLoc.lat, myLoc.lng, lat, lng);
                                            distText = d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
                                        } catch(e){}
                                    } else if (s.latitude && s.longitude) {
                                        const d = calculateDistance(myLoc.lat, myLoc.lng, s.latitude, s.longitude);
                                        distText = d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
                                    }
                                }

                                const isFavorited = favorites.has(id);

                                return (
                                    <div 
                                        key={id || index} 
                                        className={`station-item ${id === activeStationId ? 'active' : ''}`} 
                                        onClick={() => onStationClick(s)} 
                                        style={{position: 'relative'}}
                                    >
                                        <div className="item-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                <span className={`station-brand-tag brand-${brand}`}>{getBrandName(brand)}</span>
                                                <span className="station-name-lg">{name}</span>
                                            </div>
                                            <button 
                                                className="btn-favorite" type='button'
                                                onClick={(e) => handleToggleFavorite(e, s)}
                                                style={{background: 'none', border: 'none', cursor: 'pointer', padding: '5px', fontSize: '18px', color: isFavorited ? '#ff4757' : '#ccc'}}
                                            >
                                                <i className={isFavorited ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                            </button>
                                        </div>
                                        <div style={{ marginTop: '5px' }}>
                                            {priceList.length > 0 ? (
                                                // A. 상세 가격 리스트가 있는 경우 (그리드 레이아웃)
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: '1fr 1fr', // 2열 배치
                                                    gap: '6px',
                                                    backgroundColor: '#f8f9fa',
                                                    padding: '8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {priceList.map((p) => (
                                                        <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                            <span style={{ color: '#666' }}>{p.name}</span>
                                                            <span style={{ fontWeight: 'bold', color: '#333' }}>
                                                                {p.price.toLocaleString()}원
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                // B. 단일 가격만 있는 경우 (기존 디자인 유지)
                                                <div>
                                                    {singlePrice > 0 ? (
                                                        <span className="station-price-large">
                                                            {singlePrice.toLocaleString()}원
                                                        </span>
                                                    ) : (
                                                        <span style={{fontSize:'12px', color:'#999'}}>
                                                            가격 정보 없음
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {distText && (
                                            <div className="item-footer-row" style={{marginBottom: 0, marginTop: '8px'}}>
                                                <span className="station-distance-icon"><i className="fa-solid fa-location-dot"></i> {distText}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Sidebar;