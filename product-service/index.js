const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Product = require("./Product");
const isAuthenticated = require("../isAuthenticated")
var order;

var channel, connection;
app.use(express.json());

const mongoURI = 'mongodb://127.0.0.1:27017/product-service';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Terhubung ke MongoDB');
  })
  .catch((error) => {
    console.error('Kesalahan koneksi MongoDB:', error);
  });

async function connect(){
  // docker run -p 5672:5672 rabbitmq
    const amqpServer = "amqp://127.0.0.1:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
}


connect();

//Create a new product.
// Buy a product.


//User sends a list of product's IDs to buy
// Creating an order with those products and a total value of sum of product's prices.
app.post("/product/buy", isAuthenticated, async (req, res) => {
  const { ids } = req.body;
  const products = await Product.find({ _id: { $in: ids } });
  channel.sendToQueue(
      "ORDER",
      Buffer.from(
          JSON.stringify({
              products,
              userEmail: req.user.email,
          })
      )
  );
  channel.consume("PRODUCT", (data) => {
    console.log("Consuming PRODUCT queue");
    order = JSON.parse(data.content);
  });
  return res.json(order);
});



app.post("/product/create", isAuthenticated, async(req, res) =>{
    //req.user.email
    const { name, description, price} = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});


app.listen(PORT, ()=>{
    console.log(`Product-Service at ${PORT}`);
    
});