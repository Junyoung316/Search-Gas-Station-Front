import { toast } from 'react-toastify';

export const customFetch = async (url, options = {}) => {
  // 1. 기본 헤더 설정 (기존 options.headers가 있으면 병합)
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 2. Access Token 가져오기 (키 이름 확인 필수!)
  // ★ 중요: LoginModal에서 'token'으로 저장했다면 여기서도 'token'이어야 합니다.
  // 만약 변경하셨다면 'atoken'을 사용하세요. 여기서는 'atoken'으로 작성했습니다.
  const token = localStorage.getItem('atoken'); 

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. 원래 요청 시도
  let response = await fetch(url, { ...options, headers });

  // 4. 401(Unauthorized) 에러 발생 시 (토큰 만료)
  if (response.status === 401) {
    console.log("토큰 만료 감지! 재발급 시도...");

    const refreshToken = localStorage.getItem('rtoken'); // 리프레시 토큰 키 확인
    
    if (!refreshToken) {
      return response;
    }

    try {
      // 재발급 API 호출
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshRes.ok) {
        const json = await refreshRes.json();

        console.log("Refresh Token Response:", json);
        console.log("New Access Token:", json.data.accessdToken);
        console.log("New Refresh Token:", json.data.refreshToken);
        
        // 5. 새 토큰 저장 (키 이름 일치시켜야 함)
        localStorage.setItem('atoken', json.data.accessdToken);
        localStorage.setItem('rtoken', data.refreshToken); // 필요 시 갱신


        console.log("토큰 재발급 성공! 원래 요청 재시도");

        // 6. 헤더에 새 토큰 업데이트 후 재요청
        const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${json.data.accessToken}`
        };
        
        // 재요청 결과로 response 변수 덮어쓰기
        response = await fetch(url, { ...options, headers: newHeaders });

      } else {
        // 재발급 실패 시 로그아웃 처리
        handleSessionExpired();
      }
    } catch (err) {
      console.error("재발급 중 에러:", err);
      handleSessionExpired();
    }
  }

  return response;
};

// 세션 만료 처리 함수
function handleSessionExpired() {
  localStorage.removeItem('atoken');
  localStorage.removeItem('rtoken');
  localStorage.removeItem('nickname');
  // 콘솔 로그 확인
  console.log("세션 만료됨. 로그인 모달 오픈 이벤트를 발생시킵니다.");

  // ★ 핵심: 'open-login-modal'이라는 이름의 커스텀 이벤트를 발생시킴
  const event = new CustomEvent('open-login-modal', { 
      detail: { message: "세션이 만료되었습니다. 다시 로그인해주세요." } 
  });
  window.dispatchEvent(event);
}