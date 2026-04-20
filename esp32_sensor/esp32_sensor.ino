#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h> 
#include <WiFiClientSecure.h>
#include "time.h"

// ===== 1. CẤU HÌNH =====
const char* ssid = "tai1";
const char* password = "12345678";
const char* serverName = "https://nhietdovadoam-a983f-default-rtdb.asia-southeast1.firebasedatabase.app/sensor.json";
const char* historyUrl = "https://nhietdovadoam-a983f-default-rtdb.asia-southeast1.firebasedatabase.app/history.json";

const char* logFile = "/offline_log.txt";
unsigned long lastTime = 0;
const long timerDelay = 20000; 

const char* ntpServer = "time.google.com";
const long  gmtOffset_sec = 7 * 3600;
const int   daylightOffset_sec = 0;

// Lấy chuỗi thời gian hiện tại
String getTimeString() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "0000-00-00 00:00:00";
  char timeStringBuff[20];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

// --- Hàm gửi dữ liệu (Dùng setInsecure để sửa lỗi -9984) ---
void postToWeb(String payload, bool isBuffered) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // SỬA LỖI Ở ĐÂY: Chấp nhận kết nối HTTPS mà không cần check CA thủ công

  HTTPClient http;

  if(isBuffered) {
    // 1. Nếu là dữ liệu xả bù (offline): Chỉ gắn nhãn offline và đẩy thẳng POST vào /history.json (Không đè số lớn PATCH nữa)
    String offlinePayload = payload;
    offlinePayload.replace("}", ",\"status\":\"offline\"}"); // Trích nhãn offline
    
    if (http.begin(client, historyUrl)) {
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(offlinePayload);
      if (httpCode > 0) {
        Serial.printf("[GUI BU OFFLINE] => Web OK | HTTP: %d\n", httpCode);
      } else {
        Serial.printf("[LOI OFFLINE] Ma: %d\n", httpCode);
      }
      http.end();
    }
  } else {
    // 2. Nếu là dữ liệu chạy thực (online): Gửi cả PATCH và POST
    
    // 2.1 PATCH để cập nhật số đập vô mắt (sensor.json)
    if (http.begin(client, serverName)) {
      http.addHeader("Content-Type", "application/json");
      http.PATCH(payload);
      http.end();
    }
    
    // 2.2 POST để lưu danh sách bảng lịch sử dưới web (history.json)
    String onlinePayload = payload;
    onlinePayload.replace("}", ",\"status\":\"online\"}"); // Trích nhãn online
    
    if (http.begin(client, historyUrl)) {
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(onlinePayload);
      if (httpCode > 0) {
        Serial.printf("[TRUC TIEP] => Web OK | Data: %s | HTTP: %d\n", payload.c_str(), httpCode);
      } else {
        Serial.printf("[LOI TRUC TIEP] Ma: %d\n", httpCode);
      }
      http.end();
    }
  }
}

// --- Hàm gửi bù dữ liệu ---
void sendBufferedData() {
  if (!SPIFFS.exists(logFile)) return;
  File file = SPIFFS.open(logFile, FILE_READ);
  if (!file || file.size() == 0) {
    file.close(); SPIFFS.remove(logFile);
    return;
  }

  Serial.println("\n>>> DANG DAY BU DU LIEU TU BO NHO DEM...");
  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      postToWeb(line, true);
      delay(200); // Thêm delay nhỏ tránh Firebase từ chối do spam quá nhánh History
    }
  }
  file.close();
  SPIFFS.remove(logFile); 
  Serial.println(">>> DA DAY XONG DU LIEU CU.\n");
}

void setup() {
  Serial.begin(115200);
  if(!SPIFFS.begin(true)) return;

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  while(!getLocalTime(&timeinfo)){ delay(500); Serial.print("?"); }
  Serial.println("\nTime Synced: " + getTimeString());
}

void loop() {
  static unsigned long lastReconnect = 0;
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastReconnect > 5000) {
      lastReconnect = millis();
      WiFi.begin(ssid, password);
    }
  }

  if (millis() - lastTime > timerDelay) {
    lastTime = millis();
    String currentTime = getTimeString();
    float t = 20.0 + random(0, 150) / 10.0;
    float h = 40.0 + random(0, 400) / 10.0;
    
    // Giữ nguyên chuỗi payload do hàm sau nó sẽ tự xé đuôi thay thế nhãn
    String payload = "{\"temp\":" + String(t) + ",\"hum\":" + String(h) + ",\"time\":\"" + currentTime + "\"}";

    if (WiFi.status() == WL_CONNECTED) {
      if (SPIFFS.exists(logFile)) {
        sendBufferedData();
      }
      postToWeb(payload, false); 
    } 
    else {
      // MẤT MẠNG - Lưu vào bộ nhớ flash
      File file = SPIFFS.open(logFile, FILE_APPEND);
      if (file) {
        file.println(payload);
        file.close();
        Serial.printf("[OFFLINE] Mat mang! Luu: %s | Luc: %s\n", payload.c_str(), currentTime.c_str());
      }
    }
  }
}
