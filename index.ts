import { MqttClient, connect } from "mqtt";
import { io } from "socket.io-client";

async function consumeData() {
  try {
    const conn: MqttClient = connect("mqtt://52.206.90.192", {
      protocol: "mqtt",
      port: 1883,
      username: "guest",
      password: "guest",
    });

    conn.on("connect", () => {
      console.log("connection established with broker mqtt://52.206.90.192");
      // Suscribirse al topic "mqtt.metrics"
      // Se recibe el perfil del terrario
      conn.subscribe("mqtt.metrics", (err) => {
        if (err) {
          throw new Error("Error subscribing to topic: " + err);
        }
        console.log("Subscribed to topic mqtt.metrics");
      });
      conn.subscribe("mqtt/metrics/esp", (err) => {
        if (err) {
          throw new Error("Error subscribing to topic: " + err);
        }
        console.log("Subscribed to topic mqtt/metrics/esp");
      });
    });

    // Escuchar mensajes del topic "mqtt.metrics"
    conn.on("message", async (topic, message) => {
      if (topic === "mqtt/metrics") {
        const baseUrl = "";
        const data = JSON.parse(message.toString());
        const {
          max_temp,
          min_temp,
          max_humidity,
          min_humidity,
          max_uv,
          min_uv,
        } = data.terrariumProfile;
        const { id } = data;
        const formatedURL = `${baseUrl}?max_temp=${max_temp}&min_temp=${min_temp}&max_humidity=${max_humidity}&min_humidity=${min_humidity}&max_uv=${max_uv}&min_uv=${min_uv}&id=${id}`;
        console.log(data);
        console.log(formatedURL)
        //realizar peticion fetch
      } else if (topic === "mqtt/metrics/esp") {
        //formatear información
        const data = JSON.parse(message.toString());
        console.log(data);
        //enviar a traves de socket
        const socket = await io("http://44.221.215.74:8080");
        socket.emit("sendData", data);
      }
      console.log(`Received message from topic ${topic}`);
    });
  } catch (error: any) {
    throw new Error(error);
  }
}

consumeData();
