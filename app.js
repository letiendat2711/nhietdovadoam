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

    // Không dùng updateChart thêm từng phần tử nữa, vì chuyển qua đọc History array triệt để

    // 2. Firebase Variables & Elements
    const baseUrl = 'https://nhietdovadoam-a983f-default-rtdb.asia-southeast1.firebasedatabase.app';
    const firebaseUrl = `${baseUrl}/sensor.json`;
    const historyUrl = `${baseUrl}/history.json?orderBy="$key"&limitToLast=${maxDataPoints}`;

    const tempValueEl = document.getElementById('temp-value');
    const humValueEl = document.getElementById('hum-value');
    const tempOldEl = document.getElementById('temp-old');
    const humOldEl = document.getElementById('hum-old');
    const tempTimeEl = document.getElementById('temp-time');
    const humTimeEl = document.getElementById('hum-time');
    const statusIndicator = document.getElementById('mqtt-status');
    const statusText = document.getElementById('mqtt-status-text');

    // Biến lưu trữ giá trị cũ để tránh vẽ biểu đồ liên tục nếu dữ liệu không đổi
    let lastTemp = null;
    let lastHum = null;
    let lastTime = null;

    // 3. Hàm lấy dữ liệu Sensor (Chỉ số hiển thị to)
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

                const currentTempText = tempValueEl.textContent;
                const currentHumText = humValueEl.textContent;

                // Cập nhật giá trị cũ khi có thay đổi
                if (currentTempText !== '--' && currentTempText !== temp.toFixed(1)) {
                    tempOldEl.textContent = currentTempText;
                }
                if (currentHumText !== '--' && currentHumText !== hum.toFixed(1)) {
                    humOldEl.textContent = currentHumText;
                }

                // Cập nhật giao diện số
                tempValueEl.textContent = temp.toFixed(1);
                humValueEl.textContent = hum.toFixed(1);

                // Hiệu ứng cảnh báo nếu nhiêt độ cao
                if(temp >= 33) tempValueEl.classList.add('danger-value');
                else tempValueEl.classList.remove('danger-value');

                // Sử dụng thời gian từ ESP32 đẩy lên để đồng bộ (nếu có), nếu không có mới dùng giờ trình duyệt
                let timeStr = "";
                if (data.time) {
                    timeStr = data.time;
                } else {
                    const now = new Date();
                    timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                }
                
                // Cập nhật thời gian
                tempTimeEl.textContent = timeStr;
                humTimeEl.textContent = timeStr;
            }
        } catch (error) {
            console.error('Firebase Fetch Error: ', error);
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Lỗi kết nối Firebase';
        }
    }

    // 4. Hàm lấy lịch sử biểu đồ 
    async function fetchHistoryData() {
        try {
            const response = await fetch(historyUrl, { cache: "no-store" });
            if (!response.ok) return;
            const historyData = await response.json();
            
            if (historyData) {
                // Firebase trả về object key:value, chuyển thành array
                const entries = Object.values(historyData);
                
                // Reset lại mảng dữ liệu chart
                chartData.labels = [];
                chartData.datasets[0].data = [];
                chartData.datasets[1].data = [];

                entries.forEach(entry => {
                    const t = parseFloat(entry.temp);
                    const h = parseFloat(entry.hum);
                    const time = entry.time || "--:--:--";
                    
                    chartData.labels.push(time);
                    chartData.datasets[0].data.push(t);
                    chartData.datasets[1].data.push(h);
                });
                
                // Update chart không dùng cuộn hiệu ứng (tránh chớp tắt 3s 1 lần)
                sensorChart.update('none');
            }
        } catch (error) {
            console.error('History Fetch Error:', error);
        }
    }

    // 5. Khởi chạy
    fetchFirebaseData(); 
    fetchHistoryData();

    setInterval(() => {
        fetchFirebaseData();
        fetchHistoryData();
    }, 3000); // Lặp lại mỗi 3 giây tương ứng độ trễ ESP32

});
