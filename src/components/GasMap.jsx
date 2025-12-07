import React, { useState, useEffect } from 'react'; 
import { Map, MapMarker } from "react-kakao-maps-sdk";
import proj4 from 'proj4';

const katecDef = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs";

function GasMap({ mapCenter, stations, level, onRecenter, activeStationId, searchBounds }) { 
  const [mapInstance, setMapInstance] = useState(null); 

  useEffect(() => {
    if (mapInstance && searchBounds) {
      // 카카오맵 Bounds 객체 생성
      const bounds = new window.kakao.maps.LatLngBounds();
      
      // 영역의 남서쪽(Min), 북동쪽(Max) 좌표 추가
      bounds.extend(new window.kakao.maps.LatLng(searchBounds.minLat, searchBounds.minLng));
      bounds.extend(new window.kakao.maps.LatLng(searchBounds.maxLat, searchBounds.maxLng));

      // ★ 지도를 해당 영역이 다 보이도록 조정 (패딩 포함)
      mapInstance.setBounds(bounds);
      
      console.log("🗺️ 검색 결과에 맞춰 지도 영역 조정 완료");
    }
  }, [searchBounds, mapInstance]);

  // [핵심] mapCenter prop이 변경될 때마다 panTo를 강제 실행
  useEffect(() => {
    if (mapInstance && mapCenter && mapCenter.lat && mapCenter.lng) {
      const newCenter = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      
      const timerId = setTimeout(() => {
          mapInstance.panTo(newCenter);
          mapInstance.relayout(); 
          console.log(`✨ 최종 이동 성공: (${mapCenter.lat}, ${mapCenter.lng})`);
      }, 50);

      return () => clearTimeout(timerId);
    }
  }, [mapInstance, mapCenter]); 

  return (
    <div className="map-container">
      <Map 
        center={mapCenter} 
        style={{ width: "100%", height: "100%" }} 
        level={level}
        onCreate={setMapInstance}
      >
        {stations.map((s) => {
            // ★ [필터링 로직] activeStationId가 있고, 현재 마커 ID와 다르면 숨김
            if (activeStationId && s.UNI_ID !== activeStationId) {
                return null;
            }

            const [lng, lat] = proj4(katecDef, "WGS84", [s.GIS_X_COOR, s.GIS_Y_COOR]);
            return (
                <MapMarker
                    key={s.UNI_ID}
                    position={{ lat, lng }}
                    title={s.OS_NM}
                    onClick={() => alert(`${s.OS_NM}\n가격: ${s.PRICE}원`)} // TODO: 상세 정보 모달로 변경
                />
            );
        })}
      </Map>
      
      <button id="recenterBtn" onClick={onRecenter} title="현재 위치로 복귀"> 
        <i className="fa-solid fa-location-crosshairs"></i>
      </button>
    </div>
  );
}

export default GasMap;