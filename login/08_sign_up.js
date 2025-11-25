document.addEventListener('DOMContentLoaded', function() {
  // 객체 할당
const userId = document.getElementById('id'); // 아이디
const msg = document.getElementById('idMsg'); // 아이디 중복확인 메세지창 
const email = document.getElementById('email'); // 이메일
const emailMsg = document.getElementById('emailMsg'); // 이메일 형식 확인 메세지창
const userName = document.getElementById('name'); // 이름
const userPwd = document.getElementById('password'); // 비밀번호
const password_check = document.getElementById('password-confirm') // 비밀번호 메세지
const password_check2 = document.getElementById('password-match-message'); // 비밀번호 확인 메세지
const terms = document.getElementById('terms'); // 개인정보동의 버튼

// 1. 아이디 유효성 검사
function idMatch(){
const id = (userId.value || '').trim();
msg.classList.remove('fail', 'pass'); 
if(!id) { 
    msg.innerText = 'ID를 입력하세요.'; 
    msg.classList.add('fail'); 
    return false;
}
if(id.length < 5){
    msg.innerText = 'ID는 5자 이상이어야 합니다.'; 
    msg.classList.add('fail');
    return false;
}
const users = loadUsers(); 
if(users[id]){
    msg.innerText = `이미 사용 중인 ID입니다.`; 
    msg.classList.add('fail');
    return false;
} else {
    msg.innerText =`사용 가능한 ID입니다.`; 
    msg.classList.remove('fail'); 
    msg.classList.add('pass');
    return true;
} 
};

// 로그인엔 없을 수 있어서
userId.addEventListener('input', idMatch);


// 2. 이메일 유효성 검사
function emailMatch(){
const email1 = (email.value || '').trim();
emailMsg.classList.remove('fail', 'pass'); 
if(email1 == '') { 
    emailMsg.innerText = '이메일를 입력하세요.'; 
    emailMsg.classList.add('fail'); 
    return false;
}
if(!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email1.trim())){
    emailMsg.innerText = `올바른 이메일 형식으로 작성해주세요.`;
    emailMsg.classList.add('fail');
    console.log('이메일형식');
    return false;
}
const users = loadUsers(); 
const isUsed = Object.values(users).some(u => ((u.email || '').trim().toLowerCase() == email1.trim().toLowerCase()));
if(isUsed){
    emailMsg.innerText = `이미 사용 중인 이메일 주소입니다.`; 
    emailMsg.classList.add('fail');
    return false;
} else {
    console.log('이메일 테스트 성공');
    emailMsg.innerText =`사용 가능한 이메일 주소입니다.`; 
    emailMsg.classList.remove('fail'); 
    emailMsg.classList.add('pass');
    return true;
} 
}
// 입력했을 때 유효성 검사 함수 호출 실시간 검사
email.addEventListener('input', emailMatch);

// 3. 최종 회원가입 클릭시 유효성 검사
document.getElementById('signUpBtn').onclick = (e) => { 
    e.preventDefault(); 
    const id = (userId.value || '').trim();
    const name = (userName.value || '').trim();
    const email1 = (email.value || '').trim();
    const pwd = userPwd.value || '';
    if(!id || !name || !pwd || !email1){ 
        alert('필수 입력 정보를 입력해주세요');
        return; 
    }
    if(!emailMatch() || !idMatch()){
        alert('이메일 또는 아이디가 올바르지 않습니다.');
        return;
    }
    if(!terms.checked){
        alert('필수 이용약관에 동의해 주세요.');
        return;
    }
    const users = loadUsers();
    users[id] = { 
        name: name , 
        email: email1, 
        password: pwd, 
        createdAt: new Date().toLocaleString() 
    };
    saveUsers(users);
    alert('환영합니다! 회원가입이 완료되었어요.');
    userName.value = '';
    email.value = '';
    userId.value = '';
    userPwd.value = ''; 
    password_check.value = '';
    password_check2.value = '';
    msg.innerText = '';
    emailMsg.innerText = '';
    terms.checked = false;
};
});
