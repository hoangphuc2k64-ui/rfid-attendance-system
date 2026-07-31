#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

// !!! Thay <IP_LAN_CUA_MAY_BAN> bang IP that cua may tinh ban (vi du 192.168.1.5) !!!
const char* proxyURL = "http://192.168.0.105:3000/";

#define SS_PIN   5
#define RST_PIN  4
#define SCK_PIN  12
#define MISO_PIN 13
#define MOSI_PIN 11
#define BUZZER_PIN 17

MFRC522 rfid(SS_PIN, RST_PIN);
unsigned long lastScan = 0;

bool kiemTraSinhVien(String uid, String &hoTenOut, String &lopOut) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Loi: WiFi chua ket noi");
    return false;
  }

  HTTPClient http;
  String url = String(proxyURL) + "?uid=" + uid;
  Serial.print("Goi: ");
  Serial.println(url);

  http.begin(url);
  http.setTimeout(20000); // tang timeout vi Apps Script co the mat vai giay de xu ly + tinh thong ke
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.print("Loi HTTP, ma: ");
    Serial.println(httpCode);
    hoTenOut = "Loi ket noi toi server proxy";
    http.end();
    return false;
  }

  String phanHoi = http.getString();
  Serial.println("Phan hoi: " + phanHoi);
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, phanHoi);

  if (err) {
    Serial.print("Loi parse JSON: ");
    Serial.println(err.c_str());
    hoTenOut = "Loi du lieu tra ve";
    return false;
  }

  String status = doc["status"].as<String>();
  if (status == "ok") {
    hoTenOut = doc["hoten"].as<String>();
    lopOut    = doc["lop"].as<String>();
    return true;
  }

  hoTenOut = "Khong xac dinh (UID la, chua dang ky)";
  return false;
}

void baoThanhCong() {
  tone(BUZZER_PIN, 2000, 150);
}

void baoThatBai() {
  tone(BUZZER_PIN, 400, 120);
  delay(180);
  tone(BUZZER_PIN, 400, 120);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();

  Serial.println();
  Serial.println("RFID Ready");

  WiFi.begin(ssid, password);
  Serial.print("Dang ket noi WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  delay(1000);
  Serial.println("San sang. Quet the RFID de diem danh.");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  if (millis() - lastScan < 1000) {
    rfid.PICC_HaltA();
    return;
  }
  lastScan = millis();

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("---------------------");
  Serial.print("UID : ");
  Serial.println(uid);

  String hoTen = "", lop = "";
  bool ok = kiemTraSinhVien(uid, hoTen, lop);

  if (ok) {
    Serial.println("Hop le - " + hoTen + " (Lop: " + lop + ")");
    baoThanhCong();
  } else {
    Serial.println(hoTen);
    baoThatBai();
  }

  rfid.PICC_HaltA();
}