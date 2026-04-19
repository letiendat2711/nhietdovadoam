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

    // 2. MQTT Variables & Elements
    const brokerUrl = 'wss://broker.hivemq.com:8000/mqtt';
    const topicTemp = 'letiendat2711/iot/temp';
    const topicHum = 'letiendat2711/iot/hum';

    const tempValueEl = document.getElementById('temp-value');
    const humValueEl = document.getElementById('hum-value');
    const statusIndicator = document.getElementById('mqtt-status');
    const statusText = document.getElementById('mqtt-status-text');

    // Lưu tạm thời giá trị nhận được cùng thời điểm
    let latestTemp = null;
    let latestHum = null;

    // 3. Connect to MQTT Broker
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
        console.log('Connected to MQTT Broker via WebSockets');
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = 'Đã kết nối Broker';
        
        // Subscribe to topics
        client.subscribe([topicTemp, topicHum], (err) => {
            if (!err) {
                console.log(`Subscribed to: ${topicTemp}, ${topicHum}`);
            }
        });
    });

    client.on('error', (error) => {
        console.error('MQTT Connection Error: ', error);
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Lỗi kết nối';
    });

    client.on('offline', () => {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Mất kết nối';
    });

    // 4. Handle incoming messages
    client.on('message', (topic, message) => {
        const value = parseFloat(message.toString());
        if(isNaN(value)) return;

        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        if (topic === topicTemp) {
            tempValueEl.textContent = value.toFixed(1);
            latestTemp = value;
            // Hiệu ứng cảnh báo nếu nhiêt độ cao
            if(value >= 33) tempValueEl.classList.add('danger-value');
            else tempValueEl.classList.remove('danger-value');
        } else if (topic === topicHum) {
            humValueEl.textContent = value.toFixed(1);
            latestHum = value;
        }

        // Nếu nhận đủ cả hai giá trị thì vẽ biểu đồ 
        // (Do ESP32 sẽ publish gần như đồng thời)
        if(latestTemp !== null && latestHum !== null) {
            updateChart(timeLabel, latestTemp, latestHum);
            // Reset 
            latestTemp = null;
            latestHum = null;
        }
    });

});
