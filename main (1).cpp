#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_LTR329_LTR303.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_Sensor.h>
#include <SPI.h>
#include <Adafruit_I2CDevice.h>
#include <Adafruit_SPIDevice.h>

const char* WIFI_SSID = "Chelsea_FC";
const char* WIFI_PASSWORD = "Nepal123";

const char* MQTT_SERVER = "test.mosquitto.org";
const int MQTT_PORT = 1883;

// Update MQTT_TOPIC for each device
const char* MQTT_TOPIC = "manojistesting/device1"; // For Device 1
// const char* MQTT_TOPIC = "manojistesting/device2"; // For Device 2
// const char* MQTT_TOPIC = "manojistesting/device3"; // For Device 3

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

Adafruit_SHT31 sht31;
Adafruit_LTR329 ltr;

void connectToWiFi();
void reconnectToMQTT();

void setup() {
  Serial.begin(115200);

  connectToWiFi();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);

  // Initialize the sensors
  sht31.begin(0x44);
  ltr.begin();

  Serial.println("Setup complete.");
}

void loop() {
  // If not connected to the MQTT broker, attempt reconnection
  if (!mqttClient.connected()) {
    reconnectToMQTT();
  }

  // Read temperature and humidity data
  float temperatureC = sht31.readTemperature();
  Serial.print("Temperature (ºC): ");
  Serial.println(temperatureC);
  float humidity = sht31.readHumidity();
  Serial.print("Humidity (%): ");
  Serial.println(humidity);

  // Read light data
  uint16_t visible_plus_ir, infrared;
  if (ltr.newDataAvailable()) {
    bool valid = ltr.readBothChannels(visible_plus_ir, infrared);
    if (valid) {
      Serial.print("CH0 Visible + IR: ");
      Serial.print(visible_plus_ir);
      Serial.print("\tCH1 Infrared: ");
      Serial.println(infrared);
    }
  }
  // Calculate approximate Lux level (example formula)
  float lux = 0.46 * visible_plus_ir - 0.17 * infrared;

  // Format data as JSON
  String payload = "{\"device\": \"" + String(MQTT_TOPIC) +
                  "\", \"temperature\": " + String(temperatureC) +
                  ", \"humidity\": " + String(humidity) +
                  ", \"lux_light\": " + String(lux) +
                  "}";

  // Publish data to MQTT topic
  if (mqttClient.publish(MQTT_TOPIC, payload.c_str())) {
    Serial.println("Data published successfully.");
  } else {
    Serial.println("Failed to publish data.");
  }

  mqttClient.loop();
  delay(1000); // Adjust the delay as needed
}

void connectToWiFi() {
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi!");
}

void reconnectToMQTT() {
  Serial.print("Connecting to MQTT...");
  while (!mqttClient.connected()) {
    if (mqttClient.connect("ESP32Client")) {
      Serial.println("\nConnected to MQTT!");
    } else {
      Serial.print(".");
      delay(1000);
    }
  }
}
