import { sign } from "jsonwebtoken";
import { MqttClient, connect } from "mqtt";
import { io } from "socket.io-client";

async function connectToSocket(token: string) {
  try {
    const socket = await io("http://44.221.215.74:8080", {
      auth: {
        token,
      },
    });
    return socket;
  } catch (error: any) {
    throw new Error(error);
  }
}

async function consumeData() {
  try {
    const conn: MqttClient = connect("mqtt://54.91.42.48", {
      protocol: "mqtt",
      port: 1883,
      username: "guest",
      password: "guest",
    });

    conn.on("connect", () => {
      console.log("connection established with broker mqtt://52.206.90.192");
      // Suscribirse al topic "mqtt.metrics"
      // Se recibe el perfil del terrario
      conn.subscribe("mqtt/metrics/esp", (err) => {
        if (err) {
          throw new Error("Error subscribing to topic: " + err);
        }
        console.log("Subscribed to topic mqtt/metrics/esp");
      });
    });

    // Escuchar mensajes del topic "mqtt.metrics"
    conn.on("message", async (topic, message) => {
      if (topic === "mqtt/metrics/esp") {
        const token = await sign({ name: "consumerService" }, "HaruYNacho", {
          expiresIn: "1h",
        });
        const socket = await connectToSocket(token);

        //formatear información
        const data = JSON.parse(message.toString());
        console.log(data);

        socket.emit("sendData", data);
      }
      console.log(`Received message from topic ${topic}`);
    });
  } catch (error: any) {
    throw new Error(error);
  }
}

consumeData();
