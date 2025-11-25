// 로컬스트리지에 접근할 때 사용할 전역변수
const USERS_KEY = 'user_Data';
const SESSION_KEY = 'status';

// JSON.parse 실패 대비 try/catch
function loadUsers(){ 
    // local에 가서 사용자 데이터 불러오기 만약 데이터가 없다면 빈 객체로 반환
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); 
    } catch (error) {
        console.error('loadUsers parse error!!', error);
        return {}; // 에러발생시 빈 객체로 반환 js 터짐 방지
    }
}

function saveUsers(u){ // 사용자 데이터를 받을 매개변수
    // local에 가서 사용자 데이터 저장 / local은 문자열만 저장 가능하기에 객체를 문자열로 변환후 저장
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(u)); 
    } catch (error) {
        console.error('saveUsers error', error);
    }
}

function loadSession(){ 
    // 사용자 정보를 읽어와서 로그인/비로그인 상태 확인
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); 
    } catch (error) {
        console.warn('loadSession parse error', error); 
        return null;
    }
}

function saveSession(s){
    // 사용자상태(로그인)를 저장해서 브라우저를 재 실행하거나 
    // 브라우저를 닫았다 다시 열었을때 재 로그인 방지 (사용자 편의 목적) 
    localStorage.setItem(SESSION_KEY, JSON.stringify(s)); 
}

// 로그아웃 시 사용자에 대한 권한 접근 금지
// 사용자 정보로 이용하는 기능이 없기에 필요는 없지만 걍 넣어둠 
function clearSession(){
    localStorage.removeItem(SESSION_KEY); 
}

