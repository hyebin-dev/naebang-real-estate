document.addEventListener('DOMContentLoaded',()=>{
    const inner = document.querySelector('.sliderInner');
    const leftBtn = document.querySelector('.leftBtn');
    const rightBtn = document.querySelector('.rightBtn');
    const total = 3; // 총 영상 개수

    let currentIndex = 0; // 현재 활성화된 슬라이드 인덱스 저장

    const video = document.querySelectorAll('.mainvideo');

    const hero_title = document.getElementById('hero-title');
    const hero_subtitle = document.getElementById('hero-subtitle');
    const a1 = document.getElementById('a1');
    const a2 = document.getElementById('a2');

    //  문구 넣기
    const slideData = [
        {
            title: "더 정확하게, 더 편안하게",
            subtitle: "서울 지역의 흐름과 검증된 정보만으로 안내합니다.",
            a1Text: "지도 검색",
            a1link: "../map/map.html",
            a2Text: "시장 동향",
            a2link: "../estateData/estateData.html"
        },
        {
            title: "더 똑똑한 매물 선택",
            subtitle: "잘 사는 사람들의 기준과 판단 팁 영상으로 쉽게 확인하세요!",
            a1Text: "▶️ 아파트 매매의 모든 것!",
            a1link: "https://www.youtube.com/watch?v=Y3ubkizYaps",
            a2Text: "▶️ 전월세 알고 가자!",
            a2link: "https://www.youtube.com/watch?v=CUAQRN3MJm4&t=33s"   
        },
        {
            title: "내방 커뮤니티",
            subtitle: "생각, 질문, 정보 모두 자유롭게 공유하세요.",
            a1Text: "꿀팁보러가기",
            a1link: "#post-card",
            a2Text: "자유게시판",
            a2link: "../board/board.html"   
        }
    ];

    function Slider() {
        // A. 위치 이동: 현재 인덱스 * -100% 만큼 X축으로 이동
        const offset = currentIndex * (-33.7);
        inner.style.transform = `translateX(${offset}%)`;

        const currentData = slideData[currentIndex];

        hero_title.textContent = currentData.title;
        hero_subtitle.textContent = currentData.subtitle;
        a1.textContent = currentData.a1Text;
        a1.href = currentData.a1link;
        a2.textContent = currentData.a2Text;
        a2.href = currentData.a2link;

        // B. 영상 재생/정지 관리: 전환될 때마다 해당 영상만 재생하도록 설정 (선택적 최적화)
        video.forEach((video, index) => {
            if (index === currentIndex) {
                // 현재 보이는 슬라이드의 영상만 재생을 시도
                video.play().catch(error => {
                    // 자동 재생 실패 시 콘솔에 경고 표시
                    console.warn(" 해당 위치의 인덱스에서 동영상 자동 재생 실패: " + index, error);
                });
            } else {
                // 나머지 영상은 정지하고 처음으로 되돌립니다.
                video.pause(); // 재생 중인 영상 정지
                video.currentTime = 0; // 현재 미디어 재생 시점을 처음으로
            }
        });
    }

    // 2. 다음 버튼 클릭 이벤트 리스너 설정
    rightBtn.addEventListener('click', () => {
        // 마지막 인덱스(2)면 처음(0)으로, 아니면 1 증가
        currentIndex = (currentIndex === total - 1) ? 0 : currentIndex + 1;
        Slider();
    });

    // 3. 이전 버튼 클릭 이벤트 리스너 설정
    leftBtn.addEventListener('click', () => {
        // 처음 인덱스(0)면 마지막(2)으로, 아니면 1 감소
        currentIndex = (currentIndex === 0) ? total - 1 : currentIndex - 1;
        Slider();
    });

    // 4. 초기 실행 (첫 번째 영상 위치 확정 및 재생)
    Slider();
});
