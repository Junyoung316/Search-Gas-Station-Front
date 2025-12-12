import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';

function Header({ onSearchSubmit, onSignupClick, onLoginClick, onSettingsClick, isLoggedIn, userNickname, onLogout, onOpenMyInfo, userProfileImage }) {
  const [keyword, setKeyword] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogoClick = () => {
    window.location.href = "/";
  };

  // 버튼 하나로 열기/닫기 모두 처리
  const toggleSearch = () => {
    if (isSearchOpen) {
      // 열려있으면 -> 닫기 & 초기화
      setIsSearchOpen(false);
      setKeyword("");
    } else {
      // 닫혀있으면 -> 열기 & 포커스
      setIsSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleSearch = () => {
    if (!keyword.trim()) {
      toast.info("검색어를 입력해주세요!");
      return;
    }
    // ★ 부모 컴포넌트로 검색어 전달
    onSearchSubmit(keyword.trim()); 
    
    // 검색 후 입력창 닫기 (선택 사항)
    setIsSearchOpen(false); 
    setKeyword("");
  };

  const handleKeyPress = (e) => {
    // ⭐️ [핵심 수정] 글자가 조합 중(IME Composition)이라면 이벤트를 무시합니다.
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
        handleSearch();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const profileInitial = userNickname ? userNickname.charAt(0).toUpperCase() : 'U';

  return (
    <header className="header">
      {/* 1. 로고 */}
      <div className="logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
        <i className="fa-solid fa-gas-pump" style={{ marginRight: "10px" }}></i>
        오일픽
      </div>

      {/* 2. 우측 영역 */}
      <div className="header-right">
        
        <div className={`search-wrapper ${isSearchOpen ? 'active' : ''}`}>
          
          {/* 입력창 (엔터키로 검색) */}
          <input 
            ref={searchInputRef}
            type="text" 
            className="search-input-slide"
            placeholder="검색어 입력 후 엔터..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          {/* ★ 핵심: 버튼 하나가 아이콘을 바꿔가며 역할 수행 */}
          <button 
            type="button" 
            className="search-toggle-btn" 
            onClick={toggleSearch}
          >
            {/* 열려있으면 X, 닫혀있으면 돋보기 */}
            <i className={`fa-solid ${isSearchOpen ? 'fa-xmark' : 'fa-magnifying-glass'}`}></i>
          </button>
        </div>

        {/* 메뉴 버튼들 */}
        <div className="header-menu">
          {/* ★ 로그인 상태에 따라 버튼 분기 처리 ★ */}
          {isLoggedIn ? (
            // ★ [수정] 로그인 상태일 때: 프로필 아바타 + 드롭다운
            <div className="profile-dropdown-container" ref={dropdownRef}>
              <div 
                className="profile-avatar" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title={userNickname}
                style={{ backgroundColor: userProfileImage ? 'transparent' : '#1890ff', overflow: 'hidden' }}
              >
                {/* 이미지가 있으면 img 태그, 없으면 이니셜 */}
                {userProfileImage ? (
                  <img 
                      src={userProfileImage} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.target.style.display='none'; }}
                  />
                ) : (
                  profileInitial
                )}
              </div>

              {/* 드롭다운 메뉴 */}
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <span className="user-name">{userNickname}</span>님
                    <br/>
                    <span className="user-email">반갑습니다!</span>
                  </div>
                  <hr />
                  <button className="dropdown-item" onClick={() => {
                      setIsDropdownOpen(false); // 메뉴 닫고
                      onOpenMyInfo();           // 모달 열기
                  }}>
                    <i className="fa-regular fa-user"></i> 내 정보
                  </button>
                  <button className="dropdown-item" onClick={onSettingsClick}>
                    <i className="fa-solid fa-gear"></i> 설정
                  </button>
                  <hr />
                  <button className="dropdown-item logout" onClick={onLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            // 비로그인 상태 (기존 유지)
            <>
              <button className="login-btn" onClick={onLoginClick}>로그인</button>
              <button className="signup-btn" onClick={onSignupClick}>회원가입</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;