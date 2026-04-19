document.addEventListener('DOMContentLoaded', () => {
    // 1. Chart.js Initialization
    const ctx = document.getElementById('sensorChart').getContext('2d');
    
    // Gradient cho biểu đồ nhiệt độ
    const tempGradient = ctx.createLinearGradient(0, 0, 0, 400);
    tempGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // Red
    tempGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');

    // Gradient cho biểu đồ độ ẩm
    const humGradient = ctx.createLinearGradient(0, 0, 0, 400);
    humGradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)'); // Cyan
    humGradient.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

    // Dữ liệu ban đầu
    const chartData = {
        labels: [],
        datasets: [
            {
                label: 'Nhiệt độ (°C)',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: tempGradient,
                borderWidth: 2,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ef4444',
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Độ ẩm (%)',
                data: [],
                borderColor: '#06b6d4',
                backgroundColor: humGradient,
                borderWidth: 2,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#06b6d4',
                fill: true,
                tension: 0.4,
                yAxisID: 'y1'
            }
        ]
    };

    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Nhiệt độ (°C)', color: '#94a3b8' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Độ ẩm (%)', color: '#94a3b8' }
                }
            }
        }
    };

    const sensorChart = new Chart(ctx, config);

    const maxDataPoints = 20;

    function updateChart(timeLabel, tempVal, humVal) {
        chartData.labels.push(timeLabel);
        chartData.datasets[0].data.push(tempVal);
        chartData.datasets[1].data.push(humVal);

        if (chartData.labels.length > maxDataPoints) {
            chartData.labels.shift();
            chartData.datasets[0].data.shift();
            chartData.datasets[1].data.shift();
        }

        sensorChart.update();
    }

    // 2. Firebase Variables & Elements
    const firebaseUrl = 'https://nhietdovadoam-a983f-default-rtdb.asia-southeast1.firebasedatabase.app/sensor.json';

    const tempValueEl = document.getElementById('temp-value');
    const humValueEl = document.getElementById('hum-value');
    const statusIndicator = document.getElementById('mqtt-status');
    const statusText = document.getElementById('mqtt-status-text');

    // Biến lưu trữ giá trị cũ để tránh vẽ biểu đồ liên tục nếu dữ liệu không đổi
    let lastTemp = null;
    let lastHum = null;

    // 3. Hàm lấy dữ liệu từ Firebase
    async function fetchFirebaseData() {
        try {
            // Lấy dữ liệu dạng JSON (Thêm cache: no-store để không bị lưu rác dữ liệu cũ trên trình duyệt)
            const response = await fetch(firebaseUrl, { cache: "no-store" });
            
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            
            const data = await response.json();

            // Cập nhật trạng thái
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = 'Đã kết nối Firebase (HTTP)';

            // Kiểm tra dữ liệu có tồn tại không
            if (data && data.temp !== undefined && data.hum !== undefined) {
                const temp = parseFloat(data.temp);
                const hum = parseFloat(data.hum);

                // Cập nhật giao diện số
                tempValueEl.textContent = temp.toFixed(1);
                humValueEl.textContent = hum.toFixed(1);

                // Hiệu ứng cảnh báo nếu nhiêt độ cao
                if(temp >= 33) tempValueEl.classList.add('danger-value');
                else tempValueEl.classList.remove('danger-value');

                // Vẽ chart nếu dữ liệu mới có sự thay đổi (Bảo vệ hiệu năng web)
                if(temp !== lastTemp || hum !== lastHum) {
                    const now = new Date();
                    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    
                    updateChart(timeLabel, temp, hum);
                    
                    lastTemp = temp;
                    lastHum = hum;
                }
            }
        } catch (error) {
            console.error('Firebase Fetch Error: ', error);
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Lỗi kết nối Firebase';
        }
    }

    // 4. Khởi chạy
    fetchFirebaseData(); // Gọi ngay khi load trang
    setInterval(fetchFirebaseData, 3000); // Lặp lại mỗi 3 giây tương ứng độ trễ ESP32

});
