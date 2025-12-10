import React, { useEffect, useState } from 'react';
import { useKakaoLoader } from "react-kakao-maps-sdk";
import proj4 from 'proj4';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GasMap from './components/GasMap';
import FilterModal from './components/FilterModal';
import StationDetailModal from './components/StationDetailModal';
import SignupModal from './components/SignupModal';
import LoginModal from './components/LoginModal';
import SettingsModal from './components/SettingsModal';
import MyInfoModal from './components/MyInfoModal';
import { customFetch } from './utils/api';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import './index.css';

// KATEC 정의 (유지)
const katecDef = "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs";

// 반경별 줌 레벨 설정 (유지)
const getZoomLevel = (radius) => {
  if (radius <= 1000) return 5;
  if (radius <= 3000) return 6;
  if (radius <= 5000) return 7;
  return 9;
};

function App() {
  const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
  const [kakaoLoading, kakaoError] = useKakaoLoader({ appkey: apiKey, libraries: ["services", "clusterer"] });

  const defaultLoc = { lat: 37.566826, lng: 126.9786567 };
  const [myLoc, setMyLoc] = useState(defaultLoc); 
  const [stations, setStations] = useState([]);
  const [mapLevel, setMapLevel] = useState(6);
  const [filters, setFilters] = useState({ radius: 3000, fuelType: 'B027', sortType: 1 });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [activeCenter, setActiveCenter] = useState(defaultLoc); 
  const [activeStationId, setActiveStationId] = useState(null); 

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUniId, setSelectedUniId] = useState(null); // 상세 정보 조회할 UNI_ID
  const [searchBounds, setSearchBounds] = useState(null);

  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userNickname, setUserNickname] = useState('');
  const [userProfileImage, setUserProfileImage] = useState(null);

  const [isMyInfoOpen, setIsMyInfoOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const fetchUserInfo = () => {
    const token = localStorage.getItem('atoken');
    if (!token) return;

    customFetch('/api/member/me')
      .then(res => res.json())
      .then(response => {
        const data = response.data || response; // 백엔드 응답 구조에 맞게 처리
        if (data) {
          setUserNickname(data.nickname);
          setUserProfileImage(data.profileImageUrl); // 이미지 상태 업데이트
        }
      })
      .catch(err => console.error("내 정보 로드 실패:", err));
  };

  useEffect(() => {
    const handleOpenLoginModal = (event) => {
      // 1. 만약 메시지가 있다면 토스트로 띄워줍니다.
      if (event.detail && event.detail.message) {
        toast.info(event.detail.message);
      }
      
      // 2. 로그인 모달 열기
      setIsLoginOpen(true);
      
      // 3. (선택) 로그아웃 상태 처리
      setIsLoggedIn(false);
      setUserNickname('');
      setUserProfileImage(null);
    };

    window.addEventListener('open-login-modal', handleOpenLoginModal);

    // 컴포넌트 언마운트 시 리스너 제거 (메모리 누수 방지)
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLoginModal);
    };
  }, []);

  // [공통 함수] 데이터 불러오기 (유지)
  const fetchStations = (lat, lng, currentFilters) => {
    const [katecX, katecY] = proj4("WGS84", katecDef, [lng, lat]);
    const safeFilters = currentFilters || filters;

    // 2. 내부 값이 undefined면 기본값 강제 할당 (방어 코드)
    const radius = safeFilters.radius || 3000;
    const fuelType = safeFilters.fuelType || 'B027';
    const sortType = safeFilters.sortType || 1;

    console.log(`📡 API 요청: radius=${radius}, prodcd=${fuelType}`); // 확인용 로그

    const query = `x=${Math.round(katecX)}&y=${Math.round(katecY)}&radius=${radius}&prodcd=${fuelType}&sort=${sortType}`;
    
    customFetch(`/api/gas-stations?${query}`)
      .then(res => res.json())
      .then(data => {
        if (data?.RESULT?.OIL) {
          setStations(data.RESULT.OIL);
          setMapLevel(getZoomLevel(radius));
        }
      })
      .catch(err => console.error("API 호출 실패:", err));
  };

  // 1. 초기 로딩 및 GPS 획득 (유지)
  useEffect(() => {

    const token = localStorage.getItem('atoken'); // LoginModal에서 저장한 키 이름 확인 ('token')
    const nickname = localStorage.getItem('nickname');

    if (token) {
      console.log("자동 로그인: 토큰이 존재합니다.");
      setIsLoggedIn(true);
      fetchUserInfo();
      if (nickname) setUserNickname(nickname);
    } else {
      console.log("비로그인 상태입니다.");
      setIsLoggedIn(false);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { // 성공
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const newLoc = { lat, lng };
          
          setMyLoc(newLoc); 
          setActiveCenter(newLoc); 
          
          setIsLocationLoading(false); 
          fetchStations(lat, lng, filters);
        },
        (err) => { // 실패
          console.error(`위치 정보 획득 실패 (코드: ${err.code})`, err);
          toast.info("위치 정보를 가져올 수 없어 기본 위치로 시작합니다.");
          setIsLocationLoading(false); 
          fetchStations(defaultLoc.lat, defaultLoc.lng, filters);
        },
        { timeout: 5000, enableHighAccuracy: false } 
      );
    } else {
      setIsLocationLoading(false);
      fetchStations(defaultLoc.lat, defaultLoc.lng, filters);
    }
  }, []);

  // 2. [복귀 버튼 로직] GPS 재확인 후 중심으로 이동
  const handleRecenterToMyLoc = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const newLoc = { lat, lng };

                setMyLoc(newLoc); 
                setActiveCenter(newLoc); 
                
                // ★ 줌 레벨 복원
                setMapLevel(getZoomLevel(filters.radius)); 
                
                setActiveStationId(null); 
                fetchStations(lat, lng, filters);
            },
            (err) => {
                console.error("🚨 복귀 시 GPS 재확인 실패:", err);
                toast.error("현재 위치를 다시 가져오는 데 실패했습니다.");
            },
            { timeout: 5000, enableHighAccuracy: false }
        );
    } else { toast.error("GPS를 지원하지 않는 환경입니다."); }
  };
  
  // 3. [리스트 클릭] 주유소 좌표로 중심 이동 및 마커 활성화
  const handleStationClick = (stationData) => {
    // 1. 데이터 타입 확인 및 float 강제 변환 (안전장치)
    const inputX = parseFloat(stationData.GIS_X_COOR);
    const inputY = parseFloat(stationData.GIS_Y_COOR);

    if (isNaN(inputX) || isNaN(inputY)) {
        console.error("❌ Invalid coordinate data received:", stationData.OS_NM);
        toast.error("좌표 데이터가 유효하지 않아 지도를 이동할 수 없습니다.");
        return;
    }

    // 2. KATEC -> WGS84 변환 실행
    const [lng, lat] = proj4(katecDef, "WGS84", [inputX, inputY]);
    
    // WGS84 좌표 유효성 검증
    if (lng < 124 || lng > 132 || lat < 33 || lat > 43) {
        console.error("❌ WGS84 coordinates are outside Korea:", { lat, lng });
        toast.error("좌표 변환 결과가 유효하지 않습니다. 지도를 움직일 수 없습니다.");
        return;
    }
    
    // 3. Map Center & Zoom Update
    setActiveCenter({ lat, lng });
    setActiveStationId(stationData.UNI_ID); 
    setMapLevel(3); // ★ NEW: 단일 마커 클릭 시 Zoom Level 4로 설정 (확대)

    setSelectedUniId(stationData.UNI_ID);
    setIsDetailModalOpen(true);
  };
  
  // 4. [전체 보기] 선택 마커 해제
  const handleClearSelection = () => {
    setActiveStationId(null);
    setActiveCenter(myLoc); 
    
    // ★ 줌 레벨 복원
    setMapLevel(getZoomLevel(filters.radius)); 

    setIsDetailModalOpen(false); 
    setSelectedUniId(null);
  };
  
  // 5. [필터 적용] 버튼 클릭 (유지)
  const handleApplyFilter = (newFilters) => {
    setFilters(newFilters);
    fetchStations(myLoc.lat, myLoc.lng, newFilters);
  };

  if (kakaoLoading || isLocationLoading) return <div>내 위치를 찾는 중...</div>;
  if (kakaoError) return <div>지도 로드 에러!</div>;

  // [검색 실행 핸들러]
  const handleSearchSubmit = (keyword) => {
    // 1. 검색어와 함께 '현재 선택된 유종'도 보냅니다. (가격 표시용)
    const query = `keyword=${encodeURIComponent(keyword)}&prodcd=${filters.fuelType}`;
    
    customFetch(`/api/search-stations?${query}`)
        .then(res => res.json())
        .then(data => {
            if (data?.RESULT?.OIL && data.RESULT.OIL.length > 0) {
                const results = data.RESULT.OIL;
                
                // 검색 결과 리스트 업데이트
                setStations(results); 
                
                // ---------------------------------------------------------
                // ★ [핵심] 검색 결과들의 좌표 범위를 계산합니다. (자동 줌/이동)
                // ---------------------------------------------------------
                let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

                results.forEach(s => {
                    const inputX = parseFloat(s.GIS_X_COOR);
                    const inputY = parseFloat(s.GIS_Y_COOR);
                    
                    // 좌표 변환 (KATEC -> WGS84)
                    const [lng, lat] = proj4(katecDef, "WGS84", [inputX, inputY]);

                    // 최소/최대값 갱신 (영역 찾기)
                    if (lat < minLat) minLat = lat;
                    if (lat > maxLat) maxLat = lat;
                    if (lng < minLng) minLng = lng;
                    if (lng > maxLng) maxLng = lng;
                });

                // 2. 계산된 범위를 state에 저장 -> GasMap이 이를 감지하고 지도를 맞춤
                setSearchBounds({ minLat, maxLat, minLng, maxLng, timestamp: Date.now() });
                
                // 3. 검색 시에는 기존의 단일 선택 모드 해제
                setActiveStationId(null);

            } else {
                setStations([]);
                toast.error(`"${keyword}"에 대한 주유소를 찾을 수 없습니다.`);
            }
        })
        .catch(err => console.error("Search API Error:", err));
  };

  // 2. 로그인 성공 핸들러
  const handleLoginSuccess = (nickname) => {
    console.log("🔓 로그인 성공! 사용자 설정 로드 시작...");
    fetchUserInfo();
    setIsLoggedIn(true);
    setUserNickname(nickname);
    setIsLoginOpen(false); // 모달 닫기
    loadUserSettings();
  };

  // 3. 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('atoken');
    localStorage.removeItem('rtoken');
    localStorage.removeItem('nickname');

    setFilters({ radius: 3000, fuelType: 'B027', sortType: 1 });
    setUserProfileImage(null);
    setIsLoggedIn(false);
    setUserNickname('');
    toast.success("로그아웃 되었습니다.");
  };

  const loadUserSettings = () => {
    const token = localStorage.getItem('atoken');
    if (!token) return;

    customFetch('/api/my/settings')
    .then(res => res.json())
    .then(settings => {
      if (settings) {
        console.log("내 설정 불러오기 성공:", settings);
        // ★ 필터 상태를 내 설정으로 업데이트!
        setFilters({
          radius: settings.radius || 3000,
          fuelType: settings.fuelType || 'B027',
          sortType: settings.sortType || 1 // 정렬은 보통 저장 안 하거나 기본값
        });
        // 이 설정으로 주유소 데이터도 바로 다시 로드
        fetchStations(myLoc.lat, myLoc.lng, {
            radius: settings.searchRadius,
            fuelType: settings.fuelType,
            sortType: 1
        });
      }
    });
  };

  const handleUpdateSettings = (newSettings) => {
    console.log("설정 변경됨:", newSettings);

    // 1. App의 필터 상태 업데이트 (즉시 반영)
    setFilters(newSettings);

    // 2. 변경된 설정으로 주유소 데이터 다시 불러오기
    // (내 위치 myLoc과 새로운 설정 newSettings를 사용)
    fetchStations(myLoc.lat, myLoc.lng, newSettings);
    
    // 3. 지도 레벨도 변경된 반경에 맞게 조정
    setMapLevel(getZoomLevel(newSettings.radius));
  };

  const updateNicknameState = (newNickname) => {
    setUserNickname(newNickname); // 1. App의 상태 변경 (Header 자동 갱신)
    localStorage.setItem('nickname', newNickname); // 2. 로컬 스토리지 동기화 (새로고침 대비)
  };

  

  return (
    <div className="app-container">
      <Header
        onSearchSubmit={handleSearchSubmit} 
        onSignupClick={() => { setIsLoginOpen(false); setIsSignupOpen(true); }} // 로그인창 닫고 회원가입 열기
        onLoginClick={() => setIsLoginOpen(true)}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        isLoggedIn={isLoggedIn}
        userNickname={userNickname}
        onLogout={handleLogout}
        onOpenMyInfo={() => setIsMyInfoOpen(true)}
        userProfileImage={userProfileImage}
      />
      <div className="content-wrapper">
        <Sidebar 
          stations={stations} 
          onOpenFilter={() => setIsFilterModalOpen(true)}
          onStationClick={handleStationClick} 
          activeStationId={activeStationId} 
          onClearSelection={handleClearSelection} 
          myLoc={myLoc}
        />
        
        <GasMap 
          mapCenter={activeCenter} 
          stations={stations} 
          level={mapLevel} // Map Level을 props로 전달
          onRecenter={handleRecenterToMyLoc} 
          activeStationId={activeStationId}
          searchBounds={searchBounds}
        />
      </div>

      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilter}
        initialValues={filters} 
      />

      <StationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        uniId={selectedUniId} // 조회할 ID 전달
        currentFilters={filters} // 유종 조회를 위해 현재 필터 값 전달
      />

      <SignupModal 
        isOpen={isSignupOpen} 
        onClose={() => setIsSignupOpen(false)} 
        onLoginClick={() => {
            setIsSignupOpen(false); // 회원가입 닫기
            setIsLoginOpen(true);   // 로그인 열기
        }}
      />

      {/* 로그인 모달 (기존 코드 유지: 여기엔 이미 onSignupClick이 있었음) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSignupClick={() => {
            setIsLoginOpen(false);  // 로그인 닫기
            setIsSignupOpen(true);  // 회원가입 열기
        }} 
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdateSettings={handleUpdateSettings}
      />

      <ToastContainer 
        position="top-center"
        autoClose={3000} // 3초 후 자동 닫힘
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" // "light", "dark", "colored" 중 선택 가능
      />

      <MyInfoModal 
        isOpen={isMyInfoOpen} 
        onClose={() => setIsMyInfoOpen(false)}
        onLogout={() => {
            handleLogout(); // 로그아웃 시키기
            setIsMyInfoOpen(false); // 모달 닫기
        }}
        onNicknameChange={updateNicknameState}
        onProfileImageChange={(newUrl) => setUserProfileImage(newUrl)}
      />
    </div>
  );
}

export default App;