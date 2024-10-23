import { sign } from "jsonwebtoken";
import { io } from "socket.io-client";
import amqplib from "amqplib/callback_api";
import dotenv from "dotenv";
import { Schema, model, connect } from "mongoose";

dotenv.config();

const socketUrl =
  process.env.SOCKET_URL ?? "http://terrariums-socket-org.integrador.xyz:8080";
const amqpUrl = process.env.AMQP_URL ?? "amqp://54.91.42.48:5672";
const queue = process.env.QUEUE ?? "terrariumParamsQueue";
const mongoUrl = process.env.MONGO_URL ?? "";

const conn = async () => {
  try {
    await connect(mongoUrl);
    console.log("Database is connected");
  } catch (error) {
    console.error(error);
  }
};

conn();

const TerrariumSchema = new Schema(
  {
    id: Number,
    date: String,
    temperature: {
      t_max: Number,
      t_min: Number,
      t_value: Number,
    },
    humidity: {
      h_max: Number,
      h_min: Number,
      h_value: Number,
    },
    soil: {
      nitrogen: Number,
      phosphorous: Number,
      potassium: Number,
    },
    uv: {
      uv_max: Number,
      uv_min: Number,
      uv_value: Number,
    },
  },
  {
    collection: "terrariums",
  }
);

const TerrariumModel = model("Terrarium", TerrariumSchema);

async function connectToSocket(token: string) {
  try {
    const socket = await io(socketUrl, {
      auth: {
        token,
      },
      secure: true,
    });
    return socket;
  } catch (error: any) {
    throw new Error(error);
  }
}

amqplib.connect(amqpUrl, (error0, connection) => {
  if (error0) {
    throw new Error(`Error conectando: ${error0.message}`);
  }
  console.log("Conexion exitosa!");

  connection.createChannel(async (error1, channel) => {
    if (error1) {
      throw new Error(error1);
    }

    await channel.assertQueue(queue, { durable: true });

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
    channel.consume(queue, async function (msg: any) {
      try {
        const data = JSON.parse(msg.content.toString());
        const token = await sign({ name: "consumerService" }, "HaruYNacho", {
          expiresIn: "1h",
        });
        const socket = await connectToSocket(token);
        console.log(" [x] Received %s");
        console.log(data);
        const mongoReq = {
          id: data.id,
          date: new Date().toDateString(),
          temperature: {
            t_max: data.isMaxTemperature,
            t_min: data.isMinTemperature,
            t_value: data.temperatura,
          },
          humidity: {
            h_max: data.isMaxHumidity,
            h_min: data.isMinHumidity,
            h_value: data.humedad,
          },
          soil: {
            nitrogen: data.nitrogen,
            phosphorous: data.phosphorous,
            potassium: data.potassium,
          },
          uv: {
            uv_max: data.isMaxUv,
            uv_min: data.isMinUv,
            uv_value: data.uv,
          },
        };
        const documentCreated = await TerrariumModel.create(mongoReq)
        console.log(documentCreated)
        socket.emit("sendData", data);
        channel.ack(msg);
      } catch (error: any) {
        throw new Error(error.message);
      }
    });
  });
});