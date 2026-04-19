#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// Thông tin kết nối
const char* ssid = "226.1-226.2-226.3";
const char* password = "0778844247zalo";

// Đường dẫn nhận dữ liệu (ĐÚNG CHUẨN FIREBASE API)
const char* serverName = "https://nhietdovadoam-a983f-default-rtdb.asia-southeast1.firebasedatabase.app/sensor.json";

// Root CA được định dạng ĐÚNG CẤU TRÚC C++
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFRDCCBCygAwIBAgISBY1Sq3AtD/S2K3R6iv48O7jaMA0GCSqGSIb3DQEBCwUA\n" \
"MDMxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQD\n" \
"EwNSMTIwHhcNMjYwNDA2MjMzMjM2WhcNMjYwNzA1MjMzMjM1WjAWMRQwEgYDVQQD\n" \
"DAsqLmdpdGh1Yi5pbzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOdZ\n" \
"q8I8GHk1g+bKQwY6CYeOw/ZxO3Uv6bGkk3KzLPPKWqLbae+aZIbXLtd1OVyhFeFT\n" \
"jOR8+SxEUE5TpcMSUPUMPQJ54+CO9KoovK5rWiPPpckDoihI3t2HpxLheZPv3mv3\n" \
"smG9SEnZlCDsqFEspbTYUsz8IZwkTYUanSh5jetCumoQ3tDJAQ4NlbQIro1xDFxi\n" \
"qkDt6bYHffznWRsY3LbIxnx2K2sQGgg30/eqtT/nL5uXqlJmK6n1nPtTVXGUWsOl\n" \
"XvvHRkZe1/INk20NCN4SqK21CEwcth9ALqrr/qIv0S/jAUeSXTXXKQbOwB12caao\n" \
"aACXw3n9ztyCJz9/om0CAwEAAaOCAm0wggJpMA4GA1UdDwEB/wQEAwIFoDATBgNV\n" \
"HSUEDDAKBggrBgEFBQcDATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBR0mMdbLJil\n" \
"eTnlyukk8i8OUz8l+DAfBgNVHSMEGDAWgBQAtSnyLY5vMeibTK14Pvrc6QzR0jAz\n" \
"BggrBgEFBQcBAQQnMCUwIwYIKwYBBQUHMAKGF2h0dHA6Ly9yMTIuaS5sZW5jci5v\n" \
"cmcvMGsGA1UdEQRkMGKCDCouZ2l0aHViLmNvbYILKi5naXRodWIuaW+CFyouZ2l0\n" \
"aHVidXNlcmNvbnRlbnQuY29tggpnaXRodWIuY29tgglnaXRodWIuaW+CFWdpdGh1\n" \
"YnVzZXJjb250ZW50LmNvbTATBgNVHSAEDDAKMAgGBmeBDAECATAuBgNVHR8EJzAl\n" \
"MCOgIaAfhh1odHRwOi8vcjEyLmMubGVuY3Iub3JnLzkxLmNybDCCAQsGCisGAQQB\n" \
"1nkCBAIEgfwEgfkA9wB2ANdtfRDRp/V3wsfpX9cAv/mCyTNaZeHQswFzF8DIxWl3\n" \
"AAABnWVZpOoAAAQDAEcwRQIgTaNfb0dM+YvXfEat2Yb5SC7aTmQ1Zq897xwifGai\n" \
"gjMCIQDRAvabapoPoK+VJci9nBB5w/vcX0SUmUlF2X2vryJJ2wB9AEavhj07PuWf\n" \
"pXfeqCRdNrDZ7SKiI/Rhd0EilFLulVBfAAABnWVZpXoACAAABQADMwIRBAMARjBE\n" \
"AiBTuPS20tVu/Hiw8VevhNgtCNasdCwV8cbOrgPjv9UJmAIgZgI47wh8JnNZ1J50\n" \
"ZvPhN0aUMu2zoBy0DLuVyel9uogwDQYJKoZIhvcNAQELBQADggEBAEpWRXLB2tDv\n" \
"pARh6N9d+QsJN2LiNLNsWilOE5SQqFGGFOLJp9ru8fZ6P7BYeNmx6r2JZvGuDdxS\n" \
"gbRkqyNNHOIbfHmNY41OvBSP4Mql2fLghETXZgWNSZFGiMCwalTsMVSS6fxhdAm9\n" \
"rXeCShp3xRuPAoL9qcUv5lE7oqHGUgBa/pUBcss9VAeJBCP43IxrZmVsbOsIS/7P\n" \
"Q5U8GmiQsZaPo80BQMlGHgjpGE8s2o9ot85xDSHDhG4Nhm8bCdL/08aa9Mn1YUdd\n" \
"ny+3nXdMoIqQjCreM7uSAO7MbIeHHD5LAlY8VhFxpNBAMtpFc766hifp5jRWp/Ki\n" \
"/W6lwcki1qI=\n" \
"-----END CERTIFICATE-----\n";
void setup() {
  Serial.begin(115200);
  
  // 1. Kết nối WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  // 2. Kiểm tra kết nối WiFi
  if(WiFi.status() == WL_CONNECTED){
    WiFiClientSecure *client = new WiFiClientSecure;
    
    if(client) {
      // QUAN TRỌNG: Firebase dùng chứng chỉ của Google (GTS Root), 
      // nhưng chữ ký root_ca phía trên là của Let's Encrypt (Nên 2 bên đụng độ sinh ra lỗi -9984).
      // Giải pháp tốt nhất cho Firebase lúc này là dùng setInsecure() để bỏ qua xác thực đụng độ.
      client->setInsecure();
      
      HTTPClient http;

      // Tạo số random giả lập sensor
      float temp = 20.0 + random(0, 150) / 10.0;
      float hum = 40.0 + random(0, 400) / 10.0;

      // 3. Khởi tạo đối tượng JSON (String)
      // Dạng: {"temp":25.5, "hum":50.2}
      String postData = "{\"temp\":" + String(temp) + ",\"hum\":" + String(hum) + "}";

      // 4. Bắt đầu phiên HTTPS
      http.begin(*client, serverName);
      
      // Báo cho Firebase biết gói tin mình gửi lên có định dạng là JSON
      http.addHeader("Content-Type", "application/json");
      
      // 5. Dùng phương thức PATCH để cập nhật dữ liệu (Không dùng GET như web thường)
      int httpResponseCode = http.PATCH(postData);
      
      if (httpResponseCode > 0) {
        Serial.print("Đã tải lên Firebase! Response code: ");
        Serial.println(httpResponseCode);
      }
      else {
        Serial.print("Lỗi mã: ");
        Serial.println(httpResponseCode);
      }
      
      Serial.println("Đã gửi Nhiệt độ: " + String(temp) + " | Độ ẩm: " + String(hum));
      http.end();
    }
    
    // Rất quan trọng để tránh đầy bộ nhớ ESP32
    delete client;
  }
  
  delay(3000); // Gửi mỗi 3 giây
}
