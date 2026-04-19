#include <WiFi.h>
#include <PubSubClient.h>

// Thông tin WiFi (Điền thông tin WiFi của bạn vào đây)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Thông tin MQTT Broker
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
#define MSG_INTERVAL 5000 // Gửi mỗi 5 giây

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Đang kết nối tới WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  randomSeed(micros());

  Serial.println("");
  Serial.println("Đã kết nối WiFi thành công!");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Đang thử kết nối MQTT...");
    // Tạo client ID ngẫu nhiên
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("Đã kết nối tới HiveMQ broker");
    } else {
      Serial.print("Thất bại, lỗi rc=");
      Serial.print(client.state());
      Serial.println(" Thử lại sau 5 giây");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > MSG_INTERVAL) {
    lastMsg = now;

    // Sinh ngẫu nhiên nhiệt độ từ 20 đến 35
    float t = 20.0 + random(0, 150) / 10.0;
    // Sinh ngẫu nhiên độ ẩm từ 40 đến 80
    float h = 40.0 + random(0, 400) / 10.0;

    char tempString[8];
    dtostrf(t, 1, 1, tempString);
    Serial.print("Nhiệt độ: ");
    Serial.print(tempString);
    client.publish("letiendat2711/iot/temp", tempString);

    char humString[8];
    dtostrf(h, 1, 1, humString);
    Serial.print(" | Độ ẩm: ");
    Serial.println(humString);
    client.publish("letiendat2711/iot/hum", humString);
  }
}
