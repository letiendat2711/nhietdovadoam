#include <WiFi.h>
#include <PubSubClient.h>

// Thông tin kết nối
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // 1. Kết nối WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // 2. Cài đặt MQTT Broker
  client.setServer(mqtt_server, 1883);
}

void loop() {
  // 3. Kết nối với Broker nếu bị ngắt
  if (!client.connected()) {
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    client.connect(clientId.c_str());
  }
  client.loop();

  // 4. Tạo số random và Gửi lên Web (Mỗi 3 giây)
  float temp = 20.0 + random(0, 150) / 10.0;
  float hum = 40.0 + random(0, 400) / 10.0;

  char tempStr[8]; dtostrf(temp, 1, 1, tempStr);
  char humStr[8];  dtostrf(hum, 1, 1, humStr);

  client.publish("letiendat2711/iot/temp", tempStr);
  client.publish("letiendat2711/iot/hum", humStr);
  
  Serial.println("Đã gửi Nhiệt độ: " + String(tempStr) + " | Độ ẩm: " + String(humStr));

  delay(3000); // Gửi mỗi 3 giây
}
