// Require all files

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
const ordersCollection = client.db("client").collection("orders");

// all api
const run = async () => {
  // verify JWT token
  const verifyJWT = (req, res, next) => {
    const clientToken = req.headers.authorization;
    const requrestedUserEmail = req.query.email;
    console.log(requrestedUserEmail, clientToken);

    if (!clientToken) {
      return res
        .status(401)
        .send({ success: false, message: "Unauthorized Access" });
    }

    const token = clientToken.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res
          .status(403)
          .send({ success: false, message: "Forbidden Access" });
      }
      if (requrestedUserEmail !== decoded.email) {
        console.log(requrestedUserEmail, decoded.email);
        return res
          .status(401)
          .send({ success: false, message: "Unauthorized Access" });
      }
      req.decoded = decoded;

      console.log(decoded.email);
      next();
    });
  };

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
  app.patch("/updateProfile", verifyJWT, async (req, res) => {
    const email = req.query.email;
    const { address, phone, country } = req.body;
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

  // update profile picture
  app.patch("/updateProfileImage", verifyJWT, async (req, res) => {
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
  app.get("/getProfile", verifyJWT, async (req, res) => {
    const email = req.query.email;
    const user = await usersCollection.findOne({ email });
    res.send(user);
  });

  // get all products

  app.get("/products", async (req, res) => {
    const limit = parseInt(req.query.limit);
    if (!limit) {
      const products = await productsCollection.find({}).toArray();
      return res.send(products);
    }
    const products = await productsCollection.find({}).limit(limit).toArray();
    res.send(products);
  });

  // get one product
  app.get("/singleProduct", verifyJWT, async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const requestedProduct = await productsCollection.findOne(filter);
    res.send(requestedProduct);
  });

  // add product
  app.post("/addProducts", verifyJWT, async (req, res) => {
    const product = req.body;
    const result = await productsCollection.insertOne(product);
    res.send(result);
  });

  // add an order
  app.post("/purchaseProduct", async (req, res) => {
    const orderedItem = req.body;
    const result = await ordersCollection.insertOne(orderedItem);
    res.send(result);
  });

  // get orders
  app.get("/allOrders", async (req, res) => {
    const orders = await ordersCollection.find({}).toArray();
    res.send(orders);
  });

  // get one order
  app.get("/singleOrder", async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const requestedOrder = await ordersCollection.findOne(filter);
    res.send(requestedOrder);
  });

  // create payment intend
  app.post("/create-payment-intent", async (req, res) => {
    if (!req.body.price || !process.env.STRIPE_SECRET_KEY) {
      return;
    }
    const price = parseFloat(req.body.price) * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: "usd",
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  });

  // create jwt token
  app.post("/getToken", (req, res) => {
    const email = req.body.email;
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);

    res.send({ accessToken: token });
  });
};
run().catch(console.dir);

// app listening to the port
app.listen(port, () => {
  console.log("Server is Running :D");
});
