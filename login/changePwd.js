document.addEventListener('DOMContentLoaded', () => {
    // 요소들
    const Form = document.getElementById('Form');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // 입력 요소
    const userEmailInput = document.getElementById('userEmail');
    const newPasswordInput = document.getElementById('newPassword');
    const checkPassword = document.getElementById('checkPassword'); 

    // 에러 메시지 요소
    const emailMsg = document.getElementById('emailMsg');
    const newPwdMsg = document.getElementById('newPwdMsg');
    const newPwdCheckMsg = document.getElementById('newPwdCheckMsg'); 

    // 정규식표현
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*\W)\S{8,}$/; 

    // 찾은 사용자의 ID 저장 찾지 못하면 실패(-1)를 저장
    let targetUserId = -1; 

    /* 이메일로 사용자 ID 찾기 */
    function findUserIdByEmail(email) {
        const users = loadUsers(); // 로컬에서 유저정보 가져오기
        for (const uId in users) {
            if(users[uId].email == email){ // 내 입력 이메일과 로컬에 있는 정보중 이메일이 일치하는게 있다면 해당 값리턴하기
                return uId; 
            }
        }
        return null; // 찾지 못하면 null 반환
    }


    /* 메시지 초기화 */
    function clearStep1Messages(){
        if(emailMsg){
            emailMsg.textContent = '';
        } 
    }
    function clearStep2Messages(){
        if(newPwdMsg){
            newPwdMsg.textContent = '';
        } 
        if(newPwdCheckMsg){
            newPwdCheckMsg.textContent = '';
        }
    }


    /* 이메일 확인 */
    if(Form){ // form이 있어야 실행 가능
        Form.addEventListener('submit', (e) => { // 사용자 정보 확인 submit 시
            e.preventDefault();
            clearStep1Messages();
            targetUserId = -1; // 새로운 시도 시 초기화

            const userEmail = (userEmailInput.value || '').trim();
            let isStep1Valid = true; // 이메일 형식이 맞을 시 true리턴

            // 유효성 검사
            if(userEmail == ''){ // 이메일 미입력시
                if(emailMsg){
                    emailMsg.textContent = '이메일을 입력해 주세요.';
                }
                isStep1Valid = false;
            }else if(!emailRegex.test(userEmail)){ // 이메일 형식이 아닐시
                if(emailMsg){
                    emailMsg.textContent = '이메일형식으로 입력해 주세요.';
                }
                isStep1Valid = false;
            }
            if (!isStep1Valid) return;

            // LocalStorage에서 사용자 찾기
            // 이메일 비교 함수에서 사용자가 입력한 이메일 넣어서 일치하는 내용 있는지 찾기
            const foundId = findUserIdByEmail(userEmail); 

            if (foundId) {
                // 일치하는 정보 조회 성공: 찾은 사용자 ID 저장 (문자열)
                targetUserId = foundId; 

                // 조회 성공시 비밀번호 변경하는 페이지로 이동
                if (Form){
                    Form.style.display = 'none';
                }
                if(resetPasswordForm){
                    resetPasswordForm.style.display = 'block';
                }
                alert('변경 하실 새 비밀번호를 입력해주세요!');
            } else {
                // 일치하는 정보 조회 실패시
                if(emailMsg){
                    emailMsg.textContent = '해당 이메일로 등록된 사용자를 찾을 수 없습니다.';
                }
            }
        });
    }

    // 비밀번호 변경 창 으로 이동
    /* 비밀번호 재설정 */
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault(); // 폼 재부팅 방지
            clearStep2Messages(); // 비번 변경 창 경고메세지 초기화

            const newPassword = newPasswordInput.value || ''; // 에러 안뜨게 값 미입력시 빈 값으로 설정
            const checkPwd = checkPassword.value || '';
            let isStep2Valid = true; // 비밀번호 유효성 맞는지 아닌지 

            // 비밀번호 규칙 검사
            if (!passwordRegex.test(newPassword)) { // 정규표현식 규칙에 맞지 않다면 
                if (newPwdMsg) newPwdMsg.textContent = '8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.';
                isStep2Valid = false; // 유효성 탈락 false
            } 

            // 일치 검사
            if (newPassword != checkPwd) { // 새 비밀번호와 재입력 비밀번호가 틀리다면
                if (newPwdCheckMsg) newPwdCheckMsg.textContent = '비밀번호가 일치하지 않습니다.';
                isStep2Valid = false; // 유효성 탈락 false
            }
            // 유효성 검사 실패시 비밀번호 변경 안됨
            if(!isStep2Valid){
                return; 
            }

            // 3. targetUserId 유효성 확인 및 업데이트
            // 첫 번째 이메일 유효성 검사에서 통과해서 사용자 id를 가져왔으면 키값이 string으로 저장 되고
            // 아니라면 내가 설정한 -1이 저장되기에 둘다 확인 후 실행 안정성UP!
            if(targetUserId != -1 && typeof targetUserId == 'string'){
                const users = loadUsers(); // 사용자 정보 불러오기
                const uid = targetUserId; // 키값 저장 변수

                // 만약 다시 비밀번호 변경하려니 아이디가 없어졌다면 사용종료 처음으로
                if (!users[uid]) {
                    alert('오류: 사용자 정보를 찾을 수 없습니다 다시 시도해주세요.');
                    if(resetPasswordForm) resetPasswordForm.style.display = 'none'; // 비밀번호 변경창 숨기기
                    if(Form){
                        Form.style.display = 'block'; // 다시 이메일 유효성 페이지로 넘어가기
                    }
                    if(Form){
                        Form.reset();
                    }
                }

                // 비밀번호 업데이트
                users[uid].password = newPassword; // 내가 가져온 key(id)에 해당하는 사용자 정보에 비밀번호 변경 
                saveUsers(users); // 저장

                alert(`비밀번호가 성공적으로 변경되었습니다. 바로 이용해보세요!`);

                // 4. 초기화 및 로그인 페이지로 이동
                targetUserId = -1; // 비밀번호 변경 완료시 다음 사용을 위해 값 초기화
                if(resetPasswordForm){ // 비밀번호 변경 입력 창 비우기
                    resetPasswordForm.reset();
                }
                if(Form){
                    Form.reset(); // 이메일 입력 창도 비우기
                }
                // 로그인 페이지로 이동
                window.location.href = '07_login.html'; 
            } else { // 첫 번째 유효성 검사에서 이유모를 버그로 비밀번호 변경창 까지 넘어왔다면
                alert('오류!: 사용자 정보를 확인 할 수 없습니다 다시 시도해주세요.');
                if(resetPasswordForm) resetPasswordForm.style.display = 'none'; // 비밀번호 변경창 숨기기
                if(Form) Form.style.display = 'block'; // 다시 이메일 유효성 페이지로 넘어가기
                if(Form) Form.reset();
            }
        });
    }
});