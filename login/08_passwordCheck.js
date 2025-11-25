document.addEventListener('DOMContentLoaded', function() {
    // 1. 필요한 DOM 요소들을 가져옵니다.
    const passwordField = document.getElementById('password'); // 비밀번호
    const passwordMsg = document.getElementById('passwordMsg'); // 형식 확인 메세지
    const confirmField = document.getElementById('password-confirm');// 비밀번호확인
    const message = document.getElementById('password-match-message'); // 확인메세지
    const signupForm = document.querySelector('.signup-form'); // 회원가입 전체
    
    // 2. 비밀번호 일치 여부 확인
    function PasswordMatch() {
        const password = passwordField.value;
        const confirm = confirmField.value;

        // 메시지 클래스와 텍스트를 초기화
        message.textContent = '';
        message.className = 'password-message';
        
        // 두 input이 모두 비어있으면 검사하지 않습니다.
        if (password.length === 0 && confirm.length === 0) {
            confirmField.classList.remove('is-invalid');
            passwordField.classList.remove('is-invalid');
            return true; 
        }
        // 비밀번호 기본 조건의 적합한지 확인
        if(!/^(?=.*[A-Za-z])(?=.*\d)(?=.*\W)\S{8,}$/.test(password.trim())){
            passwordMsg.textContent = '비밀번호 형식이 올바르지 않습니다.';
            passwordMsg.classList.add('is-invalid');
            return false;
        } else{
            passwordMsg.textContent = '';
            passwordMsg.classList.remove('is-invalid');
        }
        
        // 비밀번호 확인에 내용이 있을 경우
        if (confirm.length > 0) {
            if (password === confirm) {
                // 일치할 경우
                message.textContent = '비밀번호가 일치합니다.';
                message.classList.add('success');
                confirmField.classList.remove('is-invalid');
                passwordField.classList.remove('is-invalid');
                return true;
            } else {
                // 불일치할 경우
                message.textContent = '비밀번호가 일치하지 않습니다.';
                message.classList.add('error');
                confirmField.classList.add('is-invalid');
                return false;
            }
        }
        
        return false; // 확인 필드에 내용이 없으면 (Submit 방지 목적)
    }

    // 3. 입력 이벤트 리스너를 추가하여 실시간으로 검사합니다.
    passwordField.addEventListener('input', PasswordMatch);
    confirmField.addEventListener('input', PasswordMatch);

    // 4. 최종적으로 폼 제출 시 유효성 검사를 수행합니다.
    signupForm.addEventListener('submit', function(event) {
        if (!PasswordMatch()) {
            // 일치하지 않으면 폼 제출을 막고 에러 메시지를 표시합니다.
            event.preventDefault(); 
            alert('비밀번호가 일치하는지 확인해주세요.');
        }
        // (여기에 다른 필수 입력 필드 검사 로직을 추가할 수 있습니다.)
    });
});