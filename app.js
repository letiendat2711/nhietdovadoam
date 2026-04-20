document.addEventListener('DOMContentLoaded', () => {
    const maxDataPoints = 50; // Giữ 50 bản ghi cho danh sách


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

    // 4. Hàm lấy lịch sử làm bảng
    async function fetchHistoryData() {
        try {
            const response = await fetch(historyUrl, { cache: "no-store" });
            if (!response.ok) return;
            const historyData = await response.json();
            
            if (historyData) {
                const entries = Object.values(historyData);
                const tbody = document.getElementById('history-tbody');
                tbody.innerHTML = '';
                
                // Đảo ngược mảng để bản ghi mới nhất hiển thị ở trên cùng
                entries.reverse().forEach(entry => {
                    const t = parseFloat(entry.temp).toFixed(1);
                    const h = parseFloat(entry.hum).toFixed(1);
                    const time = entry.time || "--:--:--";
                    
                    const row = document.createElement('tr');
                    
                    // Chữ đỏ với nhiệt > 33
                    const tempClass = t >= 33 ? 'danger-text' : '';

                    row.innerHTML = `
                        <td>${time}</td>
                        <td class="${tempClass}">${t}</td>
                        <td>${h}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                // Nếu rỗng, hiển thị thông báo
                const tbody = document.getElementById('history-tbody');
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">Chưa có dữ liệu trong kho History... Hãy mở ESP32 lên lại!</td></tr>`;
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
