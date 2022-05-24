// Require all files

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middle were

app.use(express.json());

const corsConfig = {
  origin: true,
  credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

// mongodb uri and client

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bh5yi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

app.get("/", (req, res) => {
  res.send({ message: "Server is connected" });
});

// all collection
const reviewsCollection = client.db("client").collection("reviews");
const usersCollection = client.db("users").collection("allusers");
const productsCollection = client.db("client").collection("products");

// all api

const run = async () => {
  await client.connect();

  // get all review
  app.get("/reviews", async (req, res) => {
    const result = await reviewsCollection.find({}).toArray();
    res.send(result);
  });

  //post reviews
  app.post("/reviews", async (req, res) => {
    const data = req.body;
    const result = await reviewsCollection.insertOne(data);
    res.send(result);
  });

  // add user api on new registration

  app.put("/addUser", async (req, res) => {
    const user = req.body;
    const { email } = user;
    const filter = { email };
    const option = { upsert: true };
    const updateDoc = {
      $set: user,
    };
    const result = await usersCollection.updateOne(filter, updateDoc, option);
    res.send(result);
  });

  // update user
  app.patch("/updateProfile", async (req, res) => {
    const email = req.query.email;
    const { address, phone, country, image } = req.body;
    const filter = { email };

    const updateDoc = {
      $set: {
        address,
        phone,
        country,
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  app.patch("/updateProfileImage", async (req, res) => {
    const email = req.query.email;
    const { image } = req.body;
    const filter = { email };

    const updateDoc = {
      $set: {
        image,
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  // get one user
  app.get("/getProfile", async (req, res) => {
    const email = req.query.email;
    const user = await usersCollection.findOne({ email });
    res.send(user);
  });
};
run().catch(console.dir);

// get products

app.get("/products", async (req, res) => {
  const limit = parseInt(req.query.limit);
  if (!limit) {
    const products = await productsCollection.find({}).toArray();
    return res.send(products);
  }
  const products = await productsCollection.find({}).limit(limit).toArray();
  res.send(products);
});

// create jwt token
app.post("/getToken", (req, res) => {
  const email = req.body.email;
  const token = jwt.sign(email, process.env.ACCESS_TOKEN);

  res.send({ accessToken: token });
});

// app listening to the port
app.listen(port, () => {
  console.log("Server is Running :D");
});
