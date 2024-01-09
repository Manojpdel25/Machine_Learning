const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3002;
const MONGODB_URI = 'mongodb+srv://Jonam25:Nepal123%40%40%40@machinelearning1.9bgms36.mongodb.net/?retryWrites=true&w=majority'; // Change this as needed
const mqttBroker = 'mqtt://test.mosquitto.org'; // MQTT broker URL

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Schema and Model
const sensorDataSchema = new mongoose.Schema({
  device: String,
  temperature: Number,
  humidity: Number,
  lux_light: Number,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});
const SensorData = mongoose.model('SensorData', sensorDataSchema);

// MQTT Client Setup
const mqttClient = mqtt.connect(mqttBroker);

mqttClient.on('connect', () => {
  mqttClient.subscribe('manojistesting/device1', { qos: 1 }); // Subscribe to device 1
  mqttClient.subscribe('device/device2', { qos: 1 }); // Subscribe to device 2
  mqttClient.subscribe('device/device3', { qos: 1 }); // Subscribe to device 3
  console.log('Connected to MQTT broker');
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { device, temperature, humidity, lux_light } = data;
    const sensorData = new SensorData({
      device,
      temperature,
      humidity,
      lux_light,
    });

    sensorData.save()
    .then(savedData => {
      console.log('Sensor data saved:', savedData);
    })
    .catch(err => {
      console.error('Error saving sensor data:', err);
    });
  
  } catch (err) {
    console.error('Error parsing MQTT message:', err);
  }
});

// API routes
app.get('/last24hours', async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const data = await SensorData.find({
      timestamp: { $gte: twentyFourHoursAgo },
    }).sort({ timestamp: 1 });

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/temperature', async (req, res) => {
  try {
    const temperatureData = await SensorData.find({}, 'device temperature timestamp')
      .sort({ timestamp: -1 })
      .limit(10); 
    res.json(temperatureData);
  } catch (error) {
    console.error('Error fetching temperature data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/humidity', async (req, res) => {
  try {
    const humidityData = await SensorData.find({}, 'device humidity timestamp')
      .sort({ timestamp: -1 })
      .limit(10); 
    res.json(humidityData);
  } catch (error) {
    console.error('Error fetching humidity data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/lux', async (req, res) => {
  try {
    const luxData = await SensorData.find({}, 'device lux_light timestamp')
      .sort({ timestamp: -1 })
      .limit(10); 
    res.json(luxData);
  } catch (error) {
    console.error('Error fetching lux data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
