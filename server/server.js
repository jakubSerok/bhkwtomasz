require("dotenv").config();
const port = 3001;
const stripe = require("stripe")("sk_test_7mJuPfZsBzc3JkrANrFrcDqC");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const apiUrl = "https://bhkwtomasz-backend.onrender.com";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const app = express();

// Initialize S3 client
const s3Client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Allow all origins or specify the ones you need
app.use(
  cors({
    origin: "https://scania-bhkw-ersatzteile.de",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token"],
    credentials: true, // Set this to false if not sending cookies
  })
);

app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

//Database Connection with MonoDB
mongoose.connect(
  "mongodb+srv://admin:Nimda209$@cluster0.ku8q9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Image   Engine
console.log("API URL:", apiUrl);
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

app.post("/upload/product", upload.single("productImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: 0, message: "No file uploaded" });
    }

    const fileContent = fs.readFileSync(req.file.path);
    const fileName = `products/${Date.now()}-${req.file.originalname}`;

    const uploadParams = {
      Bucket: "bhkwscania", // Replace with your bucket name
      Key: fileName,
      Body: fileContent,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(uploadParams);

    await s3Client.send(command);

    // Generate the URL for the uploaded file
    const fileUrl = `https://${uploadParams.Bucket}.s3.eu-north-1.amazonaws.com/${fileName}`;

    // Clean up local file
    fs.unlinkSync(req.file.path);

    res.json({
      success: 1,
      image_url: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    res.status(500).json({ success: 0, message: "Upload failed" });
  }
});
// New Blog Image Upload Endpoint
app.post("/upload/blog", upload.single("blogImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: 0, message: "No file uploaded" });
    }

    const fileContent = fs.readFileSync(req.file.path);
    const fileName = `blogs/${Date.now()}-${req.file.originalname}`; // Zmieniona ścieżka

    const uploadParams = {
      Bucket: "bhkwscania", // Nazwa twojego bucketa
      Key: fileName,
      Body: fileContent,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(uploadParams);

    await s3Client.send(command);

    const fileUrl = `https://${uploadParams.Bucket}.s3.eu-north-1.amazonaws.com/${fileName}`;

    fs.unlinkSync(req.file.path); // Usuwa lokalny plik

    res.json({
      success: 1,
      image_url: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading blog image to S3:", error);
    res.status(500).json({ success: 0, message: "Upload failed" });
  }
});

//Schema for Creating Products
// Schema for Creating Products
// Schema for Creating Products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  images: {
    type: Array,
    default: [],
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  available: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    required: true,
  },
  productCode: {
    type: String,
    required: true,
    match: /^[A-Za-z0-9-]+$/,
  },
  category: {
    type: String, // You can change this to Array if you want multiple categories
    required: true, // Set to true if category is mandatory
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating Endpoint for adding product
// Creating Endpoint for adding product
app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;

  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    title: req.body.title,
    images: req.body.images,
    price: req.body.price,
    stock: req.body.stock,
    available: req.body.available,
    description: req.body.description,
    productCode: req.body.productCode,
    category: req.body.category, // Add category here
  });
  await product.save();
  res.json({
    success: true,
    title: req.body.title,
  });
});

// Creating API for deleting product
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({
    success: true,
    title: req.body.title,
  });
});

// Creating API for editing a product with partial updates
// Creating API for editing a product with partial updates
app.post("/editproduct", async (req, res) => {
  try {
    const {
      id,
      title,
      images,
      price,
      stock,
      available,
      description,
      productCode,
      category, // Include category
    } = req.body;

    // Create an update object only with fields that are present in the request body
    let updateFields = {};
    if (title) updateFields.title = title;
    if (images) updateFields.images = images;
    if (price) updateFields.price = price;
    if (stock) updateFields.stock = stock;
    if (available !== undefined) updateFields.available = available;
    if (description) updateFields.description = description;
    if (productCode) updateFields.productCode = productCode;
    if (category) updateFields.category = category; // Update category if present

    // Check if there's something to update
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, errors: "No fields to update" });
    }

    // Find the product by its ID and update its details
    let updatedProduct = await Product.findOneAndUpdate(
      { id: id },
      { $set: updateFields },
      { new: true } // Return the updated product
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, errors: "Product not found" });
    }

    res.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Server error" });
  }
});
// Creating API for getting all products
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  res.send(products);
});

//Shema creating for user model

const Users = mongoose.model("Users", {
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  data: {
    type: Date,
    default: Date.now,
  },
  accountType: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});

//Creating Endpoint for regisaring user
app.post("/signup", async (req, res) => {
  try {
    // Check if a user already exists with the same email
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({
        success: false,
        errors: "User already exists with this email address",
      });
    }

    // Initialize an empty cart
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create the new user with hashed password
    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword, // Store hashed password
      cartData: cart,
    });

    // Save the user to the database
    await user.save();

    // Create JWT payload
    const data = {
      user: {
        id: user._id, // Use _id as the unique identifier
      },
    };

    // Generate a JWT token
    const token = jwt.sign(data, "tomasz_bhkw", { expiresIn: "1h" }); // Set token expiration to 1 hour

    // Respond with success and the token
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Server error" });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, errors: "Invalid email" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, errors: "Invalid password" });
    }

    const data = {
      user: {
        id: user.id,
        accountType: user.accountType, // Include account type in token data
      },
    };

    // Generate JWT token
    const token = jwt.sign(data, "tomasz_bhkw");
    res.json({ success: true, token, accountType: user.accountType }); // Send account type in response
  } catch (error) {
    res.status(500).json({ success: false, errors: "Server error" });
  }
});

// Admin Authentication Middleware
const isAdmin = (req, res, next) => {
  if (req.user.accountType !== "admin") {
    return res.status(403).json({ errors: "Access denied, admin only" });
  }
  next();
};

// Token Middleware to Fetch User
const fetchUser = (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    return res
      .status(401)
      .json({ errors: "Please authenticate using a valid token" });
  }

  try {
    const data = jwt.verify(token, "tomasz_bhkw");
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).json({ errors: "Please authenticate using a valid token" });
  }
};
// Endpoint to get the user profile
app.get("/profile", fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id); // Get user by ID
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json(user); // Return user data
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Server error" });
  }
});
// Endpoint to update the user profile
// Endpoint to update the user profile
app.post("/profile", fetchUser, async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (password) {
      // Hash the password before storing it in the database
      const hashedPassword = await bcrypt.hash(password, 10);
      req.body.password = hashedPassword;
    }

    const updatedUser = await Users.findByIdAndUpdate(
      req.user.id, // Find the user by ID
      req.body, // Update these fields
      { new: true } // Return the updated user
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: updatedUser }); // Return the updated user
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Server error" });
  }
});

//creating endpoint for add to cart
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log(req.body, req.user);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;

  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
});

app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log(req.body, req.user);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
  }

  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
});

app.post("/getcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// Blog Schema
const Blog = mongoose.model("Blog", {
  id: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  images: {
    type: Array,
    default: [],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
// Endpoint for adding a blog post
app.post("/addblog", async (req, res) => {
  let blogs = await Blog.find({});
  let id;

  if (blogs.length > 0) {
    let last_blog_array = blogs.slice(-1);
    let last_blog = last_blog_array[0];
    id = last_blog.id + 1;
  } else {
    id = 1;
  }

  const blog = new Blog({
    id: id,
    title: req.body.title,
    images: req.body.images, // This should be an array of image URLs
    description: req.body.description,
  });

  await blog.save();
  res.json({
    success: true,
    blog: blog,
  });
});

// Endpoint for editing a blog post
app.post("/editblog", async (req, res) => {
  const { id, title, images, description } = req.body;

  const updatedBlog = await Blog.findOneAndUpdate(
    { id: id },
    {
      $set: {
        title: title,
        images: images,
        description: description,
      },
    },
    { new: true } // Return the updated blog post
  );

  if (!updatedBlog) {
    return res.status(404).json({ success: false, message: "Blog not found" });
  }

  res.json({ success: true, blog: updatedBlog });
});

// Endpoint for deleting a blog post
app.post("/removeblog", async (req, res) => {
  await Blog.findOneAndDelete({ id: req.body.id });
  res.json({
    success: true,
    message: "Blog post deleted",
  });
});

// Endpoint for getting all blog posts
app.get("/allblogs", async (req, res) => {
  let blogs = await Blog.find({});
  res.send(blogs);
});

// Schema for creating Orders
const Order = mongoose.model("Order", {
  id: {
    type: Number,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  companyName: {
    // Optional company name
    type: String,
  },
  numerPodatkowy: {
    // Optional numer podatkowy (tax number)
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  products: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
});

// Endpoint for adding an order
// Endpoint for adding an order
// Creating Endpoint for adding an order
// Endpoint for adding an order
app.post("/addorder", fetchUser, async (req, res) => {
  let orders = await Order.find({});
  let id;

  if (orders.length > 0) {
    let last_order_array = orders.slice(-1);
    let last_order = last_order_array[0];
    id = last_order.id + 1;
  } else {
    id = 1;
  }

  const order = new Order({
    id: id,
    userId: req.user.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    companyName: req.body.companyName,
    numerPodatkowy: req.body.numerPodatkowy,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    postalCode: req.body.postalCode,
    country: req.body.country,
    phone: req.body.phone,
    email: req.body.email,
    products: req.body.products,
    total: req.body.total,
    paymentMethod: req.body.paymentMethod,
    status: req.body.status,
  });

  try {
    await order.save();
    // Reduce product quantity after successful order
    for (let i = 0; i < req.body.products.length; i++) {
      const product = req.body.products[i];
      const productId = product.id;
      const quantity = product.quantity;
      // Update the product quantity in the database
      const productData = await Product.findOneAndUpdate(
        { id: productId },
        { $inc: { stock: -quantity } }
      );
      if (!productData) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
    }
    res.json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error adding order:", error);
    res.status(500).json({ success: false, message: "Failed to add order" });
  }
});
// Endpoint for getting all orders
app.get("/allorders", fetchUser, isAdmin, async (req, res) => {
  let orders = await Order.find({});
  res.send(orders);
});

// Endpoint for getting orders for a specific user ID
app.get("/myorders", fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });
    if (!orders) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Server error" });
  }
});

// Endpoint for updating the status of an order
app.post("/updateorderstatus", fetchUser, isAdmin, async (req, res) => {
  const { id, status } = req.body;

  const updatedOrder = await Order.findOneAndUpdate(
    { id: id },
    {
      $set: {
        status: status,
      },
    },
    { new: true } // Return the updated order
  );

  if (!updatedOrder) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({ success: true, order: updatedOrder });
});
app.post("/create-checkout-session", async (req, res) => {
  const { amount } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Your Product Name", // Update accordingly
          },
          unit_amount: amount, // Amount in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${apiUrl}/success`, // Redirect after success
    cancel_url: `${apiUrl}/cancel`, // Redirect after cancel
  });

  res.json({ id: session.id });
});

app.get("/stats", fetchUser, isAdmin, async (req, res) => {
  try {
    const users = await Users.countDocuments({ accountType: "user" });
    const products = await Product.countDocuments();
    const orders = await Order.countDocuments();
    const visitors = 0; // Example static data; replace this with actual visitor tracking logic

    res.json({ users, products, orders, visitors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.post("/clearcart", fetchUser, async (req, res) => {
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    for (let i = 0; i < 300; i++) {
      userData.cartData[i] = 0;
    }
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userData.cartData }
    );
    res.json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
});

// Coonection test
app.listen(port, (error) => {
  if (!error) {
    console.log("Server Runninf on POrt " + port);
  } else {
    console.log("Error : " + error);
  }
});
