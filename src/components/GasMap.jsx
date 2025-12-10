import React, { useEffect, useState } from 'react';
import { Map, CustomOverlayMap } from "react-kakao-maps-sdk";
import '../App.css'; // CSS 파일 import 확인

function GasMap({ mapCenter, stations, level, onRecenter, activeStationId }) { 
  
  // 1. 지도 인스턴스 저장
  const [map, setMap] = useState(null); 

  // 2. [핵심] 마커 리스트(stations)가 바뀔 때마다 지도 범위 재설정 (Auto-fit)
  useEffect(() => {
    // 지도가 로드되지 않았거나 마커가 없으면 중단
    if (!map || stations.length === 0) return;

    // ★ 중요: 사용자가 특정 주유소를 클릭해서 보고 있을 때(상세보기 모드)는 
    // 전체 범위를 다시 잡지 않도록 방어 (줌인 상태 유지)
    if (activeStationId) return;

    // 3. Kakao Maps Bounds 객체 생성
    const bounds = new window.kakao.maps.LatLngBounds();
    let hasValidMarker = false;

    stations.forEach((station) => {
      // Sidebar에서 넘어온 데이터는 이미 lat, lng 필드를 가지고 있음 (WGS84)
      if (station.lat && station.lng) {
        bounds.extend(new window.kakao.maps.LatLng(station.lat, station.lng));
        hasValidMarker = true;
      }
    });

    // 4. 유효한 마커가 하나라도 있으면 지도 범위를 재설정
    if (hasValidMarker) {
      // setBounds(bounds, paddingBottom, paddingLeft, paddingTop, paddingRight)
      // 패딩을 주어 마커가 지도 구석에 박히지 않게 여백 확보
      map.setBounds(bounds, 50, 50, 50, 50); 
    }
  }, [map, stations, activeStationId]);


  // 5. [옵션] mapCenter prop이 강제로 변경되었을 때 (내 위치 복귀 등) 이동
  useEffect(() => {
    if (map && mapCenter && mapCenter.lat && mapCenter.lng) {
      // stations 변경에 의한 setBounds와 충돌 방지를 위해 activeStationId 체크 또는 타이머 사용
      // 여기서는 activeStationId가 있거나 내 위치 복귀 버튼 눌렀을 때만 작동한다고 가정
      const moveLatLon = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      map.panTo(moveLatLon);
    }
  }, [map, mapCenter]);


  return (
    <div className="map-container">
      <Map 
        center={mapCenter} 
        style={{ width: "100%", height: "100vh" }} // 높이 100vh 권장
        level={level}
        onCreate={setMap} // 지도 생성 시 인스턴스 저장
      >
        {stations.map((s) => {
            if (!s.lat || !s.lng) return null;
            
            const id = s.id || s.UNI_ID;
            const isActive = activeStationId === id;
            // 대표 가격 추출 (없으면 0)
            const displayPrice = s.PRICE || (s.OIL_PRICE && s.OIL_PRICE.find(p=>p.PRICE>0)?.PRICE) || 0;

            return (
                // ★ MapMarker 대신 CustomOverlayMap 사용
                <CustomOverlayMap
                    key={id}
                    position={{ lat: s.lat, lng: s.lng }}
                    yAnchor={1} // 마커의 하단 중앙이 좌표에 오도록 설정
                    zIndex={isActive ? 100 : 1} // 선택된 마커를 위로
                >
                    {/* CSS로 디자인된 HTML 마커 */}
                    <div 
                        className={`price-marker-container ${isActive ? 'active' : ''}`}
                        // onClick={() => onMarkerClick(id)} // 클릭 시 사이드바 스크롤 이동 등의 동작 연결 가능
                    >
                        <div className="price-bubble">
                            {displayPrice > 0 ? `${displayPrice.toLocaleString()}` : '정보없음'}
                        </div>
                    </div>
                </CustomOverlayMap>
            );
        })}
      </Map>
      
      {/* 내 위치 복귀 버튼 스타일 수정 */}
      <button 
        id="recenterBtn" 
        onClick={onRecenter} 
        title="현재 위치로 복귀"
        style={{
            position: 'absolute', bottom: '30px', right: '30px', zIndex: 10,
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'white', border: '1px solid #ccc',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
        }}
      > 
        <i className="fa-solid fa-location-crosshairs"></i>
      </button>
    </div>
  );
}

export default GasMap;