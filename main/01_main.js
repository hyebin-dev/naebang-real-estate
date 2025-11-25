// 로고 클릭시 메인 페이지 재로딩
document.getElementById('logo').addEventListener('click',()=>{
        location.href = '01_main.html'; // 로고 클릭시 main 재 실행
    });
// 로그인/회원가입 상태 표시
const profile = document.getElementById('profile');
const menu5 = document.getElementById('menu5');
const btnLogout = document.getElementById('btnLogout');
const userName = document.getElementById('userName');

// 로컬에서 로그인 상태 확인
const loginUser = loadSession(); // 로컬에서 로그인 한 정보 가져오기
// 로그인 성공시
if (loginUser) {
    menu5.classList.add('hidden'); // 로그인 하면 로그인/회원가입 폼 가리기
    profile.classList.remove('hidden'); // 로그인 후 정보 보이게
    userName.textContent = loginUser.name;
} else {
    // 비로그인 상태로
    menu5.classList.remove('hidden'); 
    profile.classList.add('hidden');
}

// 로그아웃 버튼 클릭 시
btnLogout.addEventListener('click', () => {
    clearSession(); 
    location.reload(); // 로그아웃 후 새로고침
});
