import React, { useState, useEffect, useRef } from 'react';
import { customFetch } from '../utils/api';
import { toast } from 'react-toastify';
import proj4 from 'proj4';

// KATEC 좌표계 정의
const katecDef = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs";

const PRODUCT_NAMES = {
    'B027': '휘발유', 'D047': '경유', 'K015': 'LPG', 'C004': '등유', 'B034': '고급휘발유'
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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

function Sidebar({ stations, onOpenFilter, onStationClick, activeStationId, onClearSelection, myLoc, onMapUpdate }) {
    
    // ★ [수정 1] 새로고침 해도 탭 유지하기 (localStorage 사용)
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('sidebarActiveTab') || 'search';
    });

    const [favorites, setFavorites] = useState(new Set());
    const [favoriteStations, setFavoriteStations] = useState([]);
    const [isLoadingFavs, setIsLoadingFavs] = useState(false);

    // ★ [수정 2] API 중복 호출 방지용 Ref
    const isFetchingRef = useRef(false);
    
    // 지도 업데이트용 Ref
    const prevMapDataRef = useRef("");

    // 1. 단골 주유소 데이터 가져오기
    const fetchFavoriteDetails = async () => {
        const token = localStorage.getItem('atoken');
        if (!token) return;

        // ★ [핵심] 이미 로딩 중이면 함수 종료 (중복 호출 방지)
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        setIsLoadingFavs(true);
        try {
            console.log("🚀 단골 주유소 데이터 요청 시작");
            
            // (1) 찜 목록 ID 가져오기
            const idRes = await customFetch('/api/favorites/gas-station', { method: 'GET' });
            if (!idRes.ok) throw new Error("찜 목록 조회 실패");
            
            const idJson = await idRes.json();
            let idList = [];
            if (idJson.data && Array.isArray(idJson.data)) {
                 idList = idJson.data.map(item => (typeof item === 'object' ? item.stationCode || item.UNI_ID : item));
            }
            setFavorites(new Set(idList));

            if (idList.length === 0) {
                setFavoriteStations([]);
                return; // 데이터 없으면 종료
            }

            // (2) 상세 정보 요청
            const detailPromises = idList.map(async (id) => {
                try {
                    const detailRes = await customFetch(`/api/station-detail?uniId=${id}`, { method: 'GET' });
                    if (detailRes.ok) {
                        const detailJson = await detailRes.json();
                        
                        let result = null;
                        if (detailJson.RESULT && detailJson.RESULT.OIL && Array.isArray(detailJson.RESULT.OIL)) {
                            result = detailJson.RESULT.OIL[0];
                        } else if (detailJson.data) {
                            result = Array.isArray(detailJson.data) ? detailJson.data[0] : detailJson.data;
                        }
                        
                        if (result) return result;
                    }
                } catch (err) { console.error(err); }
                return null;
            });

            const results = await Promise.all(detailPromises);
            const validData = results.filter(s => s !== null);
            
            console.log("✅ 단골 주유소 로딩 완료:", validData.length, "개");
            setFavoriteStations(validData);

        } catch (error) {
            console.error("단골 주유소 로딩 중 오류:", error);
        } finally {
            setIsLoadingFavs(false);
            isFetchingRef.current = false; // ★ [핵심] 로딩 상태 해제
        }
    };

    // 초기 로드
    useEffect(() => {
        // '단골 주유소' 탭일 때만 데이터를 불러오거나, 
        // 혹은 미리 불러오고 싶다면 여기서 호출. 
        // 보통은 사용자가 탭을 눌렀을 때 불러오는게 효율적이지만, 
        // 탭 상태를 유지한다면 바로 불러와야 함.
        fetchFavoriteDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // 탭 변경 핸들러 (localStorage 저장 추가)
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        localStorage.setItem('sidebarActiveTab', tabName); // 탭 상태 저장
        if (tabName === 'favorites') {
            fetchFavoriteDetails();
        }
    };

    // 지도 업데이트 로직
    useEffect(() => {
        if (!onMapUpdate) return;

        const targetList = activeTab === 'search' ? stations : favoriteStations;

        const mapData = targetList.map(s => {
            let lat = s.latitude || s.lat; 
            let lng = s.longitude || s.lng;

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

        const currentDataStr = JSON.stringify(mapData);
        if (prevMapDataRef.current !== currentDataStr) {
            onMapUpdate(mapData);
            prevMapDataRef.current = currentDataStr;
        }

    }, [activeTab, stations, favoriteStations, onMapUpdate]);


    // 찜 토글
    const handleToggleFavorite = async (e, station) => {
        e.preventDefault();
        e.stopPropagation();
        const token = localStorage.getItem('atoken'); 
        if (!token) {
            window.dispatchEvent(new CustomEvent('open-login-modal', { detail: { message: "로그인이 필요합니다." } }));
            return;
        }

        const id = station.UNI_ID || station.stationCode;
        try {
            const response = await customFetch('/api/favorites/gas-station', {
                method: 'POST',
                body: JSON.stringify({ stationCode: id })
            });

            if (response.ok) {
                const json = await response.json();
                if (json.status == 200) {
                    setFavorites(prev => new Set(prev).add(id));
                    setFavoriteStations(prev => [...prev, station]); 
                } else {
                    setFavorites(prev => { const n = new Set(prev); n.delete(id); return n; });
                    setFavoriteStations(prev => prev.filter(s => (s.UNI_ID || s.stationCode) !== id));
                }
            }
        } catch (error) { console.error(error); }
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
                
                <div className="sidebar-tabs" style={{display: 'flex', gap: '10px'}}>
                    <button 
                        onClick={() => handleTabChange('search')} // 핸들러 변경
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
                        onClick={() => handleTabChange('favorites')} // 핸들러 변경
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
                        <br/>불러오는 중...
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
                                const id = s.UNI_ID || s.stationCode;
                                const name = s.OS_NM || s.name;
                                const brand = s.POLL_DIV_CD || s.POLL_DIV_CO || s.brand;
                                
                                let priceList = [];
                                if (s.OIL_PRICE && Array.isArray(s.OIL_PRICE)) {
                                    priceList = s.OIL_PRICE
                                        .filter(p => p.PRICE > 0)
                                        .map(p => ({
                                            code: p.PRODCD,
                                            name: PRODUCT_NAMES[p.PRODCD] || p.PRODCD,
                                            price: p.PRICE
                                        }));
                                    const order = ['B034', 'B027', 'D047', 'K015', 'C004'];
                                    priceList.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
                                }
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

                                        <div style={{ marginTop: '8px' }}>
                                            {priceList.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '6px' }}>
                                                    {priceList.map((p) => (
                                                        <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                            <span style={{ color: '#666' }}>{p.name}</span>
                                                            <span style={{ fontWeight: 'bold', color: '#333' }}>{p.price.toLocaleString()}원</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div>
                                                    {singlePrice > 0 ? <span className="station-price-large">{singlePrice.toLocaleString()}원</span> : <span style={{fontSize:'12px', color:'#999'}}>가격 정보 없음</span>}
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