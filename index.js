const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

const URI = process.env.MONGODB_URI;
const FIREBASE_SDK = require("./firebase-adminsdk.json");

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_SDK),
});

const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authGuard = async (req, res, next) => {
  const { authorization: bearerToken } = req.headers;

  if (!bearerToken) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const token = bearerToken.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);

    return res.status(403).json({
      success: false,
      message: "Forbidden access",
    });
  }
};

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();
    const db = await client.db("explore_express_db");

    // Collections
    const Product = db.collection("products");
    const Wishlist = db.collection("wishlists");

    // PRODUCTS
    // Create products
    app.post("/products", async (req, res) => {
      const payload = { _id: new ObjectId(), ...req.body };
      await Product.insertOne(payload);

      return res.status(201).json({
        success: true,
        message: "Product create successful",
        data: payload,
      });
    });

    // Get all products
    app.get("/products", async (_req, res) => {
      const result = await Product.find().toArray();

      return res.status(200).json({
        success: true,
        message: "Products retrieved successful",
        data: result,
      });
    });

    // Get single product
    app.get("/products/:id", async (req, res) => {
      const { id } = req.params;

      const result = await Product.findOne({
        _id: new ObjectId(id),
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product retrieved successful",
        data: result,
      });
    });

    // Update single product
    app.patch("/products/:id", async (req, res) => {
      const { id } = req.params;
      const payload = req.body;

      const product = await Product.findOne({
        _id: new ObjectId(id),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const result = await Product.findOneAndUpdate(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            name: payload.name || product.name,
            price: payload.price || product.price,
          },
        },
        { returnDocument: "after" }
      );

      return res.status(200).json({
        success: true,
        message: "Product updated successful",
        data: result,
      });
    });

    // Delete single product
    app.delete("/products/:id", async (req, res) => {
      const { id } = req.params;

      const product = await Product.findOne({
        _id: new ObjectId(id),
      });

      if (!product) {
        return res.json({
          data: null,
        });
      }

      await Product.deleteOne({
        _id: new ObjectId(id),
      });

      return res.status(200).json({
        success: true,
        message: "Product deleted successful",
      });
    });

    // WISHLISTS
    // Create wishlist
    app.post("/wishlists", async (req, res) => {
      const payload = { _id: new ObjectId(), ...req.body };
      await Wishlist.insertOne(payload);

      return res.status(201).json({
        success: true,
        message: "Wishlist created successful",
        data: payload,
      });
    });

    // Get my wishlists
    app.get("/wishlists/my-wishlist", authGuard, async (req, res) => {
      const { email } = req.user;

      const result = await Wishlist.find({ email }).toArray();

      return res.status(200).json({
        success: true,
        message: "Wishlists retrieved successful",
        data: result,
      });
    });

    // Delete wishlist
    app.delete("/wishlists/:id", authGuard, async (req, res) => {
      const { id } = req.params;
      const { email } = req.user;
      const result = await Wishlist.findOne({ _id: new ObjectId(id), email });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Wishlist not found",
        });
      }
      await Wishlist.deleteOne({ _id: new ObjectId(id), email });

      return res.status(200).json({
        success: true,
        message: "Wishlist deleted successful",
      });
    });

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
