const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const URI = process.env.MONGODB_URI;

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();
    const db = await client.db("explore_express_db");
    const Product = db.collection("products");

    // write business logic here
    // PRODUCTS
    // Create products
    app.post("/products", async (req, res) => {
      const payload = req.body;
      const result = await Product.insertOne(payload);

      return res.json({
        statusCode: 201,
        success: true,
        data: result,
      });
    });

    // app.get("/products", async (_req, res) => {
    //   const products = await Product.find().toArray();
    //   console.log("products from database", products);
    // });

    await db.command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.log("Error from mongodb", error);
  }
}
run();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
