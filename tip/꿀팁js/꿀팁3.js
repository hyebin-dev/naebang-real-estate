document.addEventListener('DOMContentLoaded', () => {
    // 1. 전국 주택 전셋값 차트
    const rentCtx = document.getElementById('rentChart').getContext('2d');
    new Chart(rentCtx, {
        type: 'doughnut',
        data: {
            labels: ['상승', '기타'],
            datasets: [{
                data: [4.0, 96.0], // 4.0% 상승
                backgroundColor: ['red', '#e0e0e0'],
                borderColor: ['red', '#e0e0e0'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });

    // 2. 전국 매매가 상승률 차트
    const saleCtx = document.getElementById('saleChart').getContext('2d');
    new Chart(saleCtx, {
        type: 'doughnut',
        data: {
            labels: ['상승', '기타'],
            datasets: [{
                data: [0.8, 99.2], // 0.8% 상승
                backgroundColor: ['red', '#e0e0e0'],
                borderColor: ['red', '#e0e0e0'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });

    // 3. 주택 인허가/착공 추이 차트 (단순 감소 시뮬레이션)
    const supplyCtx = document.getElementById('supplyChart').getContext('2d');
    new Chart(supplyCtx, {
        type: 'line',
        data: {
            labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
            datasets: [{
                label: '인허가/착공 물량',
                data: [100, 90, 70, 50, 30, 10], // 감소 추이 시뮬레이션
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: false,
                    }
                },
                y: {
                    display: true, // Y축 레이블 표시
                    title: {
                        display: true, // Y축 제목 표시
                        text: '단위: 만 호(추정)' // 원하는 단위를 여기에 입력
                    },
                    // Y축 레이블 포맷 설정 (선택 사항)
                    ticks: {
                        callback: function(value, index, ticks) {
                            // 데이터가 [100, 90, ...]이므로, 
                            // 실제 수치로 환산된 값을 표시하려면 여기에 로직이 필요합니다.
                            return value; // 현재는 [100, 90, ...] 값을 그대로 표시
                        }
                    }
                }
            }
        }
    });

    // 4. 2026년 집값 전망 설문 차트
    const sentimentCtx = document.getElementById('sentimentChart').getContext('2d');
    new Chart(sentimentCtx, {
        type: 'pie',
        data: {
            labels: ['상승', '하락/유지'],
            datasets: [{
                data: [52, 48], // 설문조사 결과 (52% 상승, 나머지는 하락/유지)
                backgroundColor: ['red', 'blue'], // 기존 색상으로 통일
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: false
                },
                // ➡️ datalabels 플러그인 설정
                datalabels: {
                    formatter: (value, ctx) => {
                        // 전체 합계를 계산합니다.
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => {
                            sum += data;
                        });
                        // 퍼센트 계산 및 반올림
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    },
                    color: '#fff', // 텍스트 색상을 흰색으로 설정
                    font: {
                        weight: 'bold', // 텍스트를 굵게
                        size: 14 // 폰트 크기
                    }
                }
            }
        },
        // ➡️ 플러그인을 차트에 등록
        plugins: [ChartDataLabels] 
    });
});