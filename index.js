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
        return res
          .status(401)
          .send({ success: false, message: "Unauthorized Access" });
      }
      req.decoded = decoded;

      next();
    });
  };

  const verifyAdmin = async (req, res, next) => {
    const requestedUserEmail = req.query.email;

    const filter = { email: requestedUserEmail };
    const result = await usersCollection.findOne(filter);

    if (result?.role !== "admin") {
      return res
        .status(401)
        .send({ success: false, message: "Unauthorized Access" });
    }
    next();
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

    const userExists = await usersCollection.findOne(filter);
    if (userExists) {
      return res.send({ message: "user already exists" });
    }
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

  // get all user
  app.get("/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
    const users = await usersCollection.find({}).toArray();

    res.send(users);
  });

  // make user admin
  app.patch("/makeAdmin", verifyJWT, verifyAdmin, async (req, res) => {
    const id = req.body.id;
    const filter = { _id: ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: "admin",
      },
    };
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // delete user
  app.delete("/deleteOneUser", verifyJWT, verifyAdmin, async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const result = await usersCollection.deleteOne(filter);
    res.send(result);
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

  // delete one product
  app.delete("/deleteOneProduct", verifyJWT, verifyAdmin, async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const result = await productsCollection.deleteOne(filter);
    res.send(result);
  });

  // add an order
  app.post("/purchaseProduct", verifyJWT, async (req, res) => {
    const orderedItem = req.body;
    const result = await ordersCollection.insertOne(orderedItem);
    res.send(result);
  });

  // get all orders
  app.get("/allOrders", verifyJWT, verifyAdmin, async (req, res) => {
    const orders = await ordersCollection.find({}).toArray();
    res.send(orders);
  });

  // get users orders
  app.get("/UsersOrders", verifyJWT, async (req, res) => {
    const email = req.decoded.email;
    const orders = await ordersCollection.find({ email }).toArray();
    res.send(orders);
  });

  // get paid orders
  app.get("/UsersPaidOrders", verifyJWT, async (req, res) => {
    const email = req.decoded.email;

    const orders = await ordersCollection.find({ email, paid: true }).toArray();
    res.send(orders);
  });

  // get one order
  app.get("/singleOrder", verifyJWT, async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const requestedOrder = await ordersCollection.findOne(filter);
    res.send(requestedOrder);
  });

  // update order paid information and transaction id
  app.patch("/updateSignleOrder", verifyJWT, async (req, res) => {
    const transactionId = req.body.transactionId;
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const updatedDoc = {
      $set: {
        paid: true,
        transactionId,
      },
    };

    const result = await ordersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // update Delivery status
  app.patch("/updateDeliveryStatus", async (req, res) => {
    const id = req.body.id;
    const filter = { _id: ObjectId(id) };
    const updatedDoc = {
      $set: {
        deliveryStatus: true,
      },
    };
    const result = await ordersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // delete order
  app.delete("/deleteOneProduct", verifyJWT, async (req, res) => {
    const id = req.query.id;

    const filter = { _id: ObjectId(id) };
    const result = await ordersCollection.deleteOne(filter);
    res.send(result);
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

  // get the admin
  app.get("/isAdmin", async (req, res) => {
    const email = req.query.email;
    const user = await usersCollection.findOne({ email });
    if (user.role === "admin") {
      return res.json({ isAdmin: true });
    }
    res.json({ isAdmin: false });
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
