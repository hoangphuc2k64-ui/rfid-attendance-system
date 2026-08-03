#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* proxyURL = "http://192.168.0.105:3000/";

#define SS_PIN   5
#define RST_PIN  4
#define SCK_PIN  12
#define MISO_PIN 13
#define MOSI_PIN 11
#define BUZZER_PIN 17
#define RELAY_PIN 16

#define OLED_SDA 8
#define OLED_SCL 9
#define OLED_WIDTH 128
#define OLED_HEIGHT 64

MFRC522 rfid(SS_PIN, RST_PIN);
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

unsigned long lastScan = 0;

void hienThi(String dong1, String dong2 = "") {
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 10);
  display.println(dong1);
  if (dong2 != "") {
    display.setTextSize(1);
    display.setCursor(0, 40);
    display.println(dong2);
  }
  display.display();
}

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
  http.setTimeout(20000);
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.print("Loi HTTP, ma: ");
    Serial.println(httpCode);
    hoTenOut = "Loi ket noi";
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
    hoTenOut = "Loi du lieu";
    return false;
  }

  String status = doc["status"].as<String>();
  if (status == "ok") {
    hoTenOut = doc["hoten"].as<String>();
    lopOut    = doc["lop"].as<String>();
    return true;
  }

  hoTenOut = "The la";
  return false;
}

void moCua() {
  digitalWrite(RELAY_PIN, HIGH);
  delay(2000);
  digitalWrite(RELAY_PIN, LOW);
}

void bipThuCong(int tanSo, int thoiGianMs) {
  int chuKy = 1000000 / tanSo; // micro giay cho 1 chu ky
  long soChuKy = (long)thoiGianMs * 1000 / chuKy;
  for (long i = 0; i < soChuKy; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delayMicroseconds(chuKy / 2);
    digitalWrite(BUZZER_PIN, LOW);
    delayMicroseconds(chuKy / 2);
  }
}

void baoThanhCong() {
  bipThuCong(2000, 150);
}

void baoThatBai() {
  bipThuCong(400, 120);
  delay(180);
  bipThuCong(400, 120);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Khong tim thay OLED");
  }
  display.clearDisplay();
  display.display();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.println();
  Serial.println("RFID Ready");
  hienThi("READY", "Quet the de vao");

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
  Serial.println("San sang. Quet the RFID de vao cua.");
  hienThi("READY", "Quet the de vao");
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

  hienThi("Dang kiem tra...");

  String hoTen = "", lop = "";
  bool ok = kiemTraSinhVien(uid, hoTen, lop);

  if (ok) {
    Serial.println("Hop le - " + hoTen + " (Lop: " + lop + ") - MO CUA");
    hienThi("Moi vao", hoTen);
    baoThanhCong();
    moCua();
  } else {
    Serial.println("Khong hop le: " + hoTen);
    hienThi("THE KHONG", "DUNG");
    baoThatBai();
  }

  delay(1000);
  hienThi("READY", "Quet the de vao");

  rfid.PICC_HaltA();
}
