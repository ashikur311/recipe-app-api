import express from "express";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  userInfoTable,
  shopTable,
  productTable,
  cartTable,
  sellTable,
  expenseTable,
  orderTable,
  customerTable,
  shopCustomerTable,
  shopOwnerTable
} from "../src/db/schema.js";
import { eq, and, or, like, gt, lt, count, sum } from "drizzle-orm";

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8001;

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/shop-images';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
  }
});

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

// ------------------- IMAGE UPLOAD ENDPOINT -------------------
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.path.replace(/^uploads[\\/]/, '')}`;
  res.status(201).json({ imageUrl });
});

// ------------------- USER ENDPOINTS -------------------
// Insert New User
app.post("/api/users", async (req, res) => {
  try {
    const { userId, username, image } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const newUser = await db.insert(userInfoTable).values({
      userId,
      username,
      image
    }).returning();
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get User Info
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userId, userId));
    
    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json(user[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- SHOP ENDPOINTS -------------------
// Create New Shop With Owner ID
app.post("/api/shops", upload.single('shopImage'), async (req, res) => {
  try {
    const { shopName, location, type, ownerId } = req.body;
    if (!shopName || !ownerId) {
      return res.status(400).json({ error: "shopName and ownerId are required" });
    }
    
    let shopImageUrl = null;
    if (req.file) {
      shopImageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.path.replace(/^uploads[\\/]/, '')}`;
    }

    const newShop = await db.insert(shopTable).values({
      shopName,
      location,
      type,
      shopImage: shopImageUrl,
      ownerId
    }).returning();
    
    // Add to shop_owner table
    await db.insert(shopOwnerTable).values({
      shopId: newShop[0].shopId,
      userId: ownerId
    });
    
    res.status(201).json(newShop[0]);
  } catch (error) {
    console.error("Error creating shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all shops for a user
app.get("/api/users/:userId/shops", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const shops = await db.select()
      .from(shopTable)
      .where(eq(shopTable.ownerId, userId));
    
    res.status(200).json(shops);
  } catch (error) {
    console.error("Error fetching user shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Shop information by receiving Owner Id
app.get("/api/shops/owner/:ownerId", async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    const shop = await db.select()
      .from(shopTable)
      .where(eq(shopTable.ownerId, ownerId));
    
    if (shop.length === 0) {
      return res.status(404).json({ error: "No shop found for this owner" });
    }
    
    res.status(200).json(shop[0]);
  } catch (error) {
    console.error("Error fetching shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/shops/details/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const numericId = Number(shopId);

    // 1) Load the shop
    const [shopRow] = await db
      .select()
      .from(shopTable)
      .where(eq(shopTable.shopId, numericId));

    if (!shopRow) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // 2) Gather stats
    const [{ count: productCount }] = await db
      .select({ count: count() })
      .from(productTable)
      .where(eq(productTable.shopId, numericId));

    const [{ count: saleCount }] = await db
      .select({ count: count() })
      .from(sellTable)
      .where(eq(sellTable.shopId, numericId));

    const [{ sum: totalRevenue }] = await db
      .select({ sum: sum(sellTable.totalAmount) })
      .from(sellTable)
      .where(eq(sellTable.shopId, numericId));

    // 3) Fetch **all** products for this shop
    const products = await db
      .select()
      .from(productTable)
      .where(eq(productTable.shopId, numericId));

    // 4) Return everything together
    res.json({
      ...shopRow,
      stats: {
        productCount: productCount ?? 0,
        saleCount:    saleCount    ?? 0,
        totalRevenue: totalRevenue ?? 0,
      },
      products,    // <— here’s the missing piece
    });
  } catch (err) {
    console.error("Error fetching shop details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- PRODUCT ENDPOINTS -------------------
// Add new Products With the shopId
app.post('/api/products/shopId/:shopId', async (req, res) => {
  try {
    // pull shopId from the URL, fall back if someone also sent it in the body
    const shopId = Number(req.params.shopId) || Number(req.body.shopId);
    const { name, price, quantity } = req.body;

    if (!shopId || !name || !price) {
      return res.status(400).json({ error: 'shopId, name, and price are required' });
    }

    const newProduct = await db.insert(productTable).values({
      shopId,
      name,
      price,
      quantity: quantity || 0,
    }).returning();

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.post('/api/customers', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    const [newCustomer] = await db
      .insert(customerTable)
      .values({ mobile })
      .returning();
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link an existing customer to a shop
app.post('/api/shops/:shopId/customers', async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }
    await db.insert(shopCustomerTable).values({ shopId, customerId });
    res.status(201).json({ shopId, customerId });
  } catch (error) {
    console.error('Error linking customer to shop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all customers for a shop
app.get('/api/shops/:shopId/customers', async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);
    const rows = await db
      .select()
      .from(customerTable)
      .innerJoin(
        shopCustomerTable,
        eq(customerTable.customerId, shopCustomerTable.customerId)
      )
      .where(eq(shopCustomerTable.shopId, shopId));
    // rows come back as { customerTable: { … }, shopCustomerTable: { … } }
    const customers = rows.map(r => r.customerTable);
    res.status(200).json(customers);
  } catch (error) {
    console.error('Error fetching shop customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------- CART ENDPOINTS -------------------

// Add (or update) a product in a customer's cart
app.post('/api/cart', async (req, res) => {
  try {
    const { customerId, productId, quantity } = req.body;
    if (!customerId || !productId || !quantity) {
      return res
        .status(400)
        .json({ error: 'customerId, productId and quantity are required' });
    }

    // 1) get product price
    const [product] = await db
      .select()
      .from(productTable)
      .where(eq(productTable.productId, productId));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const subtotal = parseFloat(product.price) * quantity;

    // 2) compute running total for that cart
    const [{ total = 0 }] = await db
      .select({ total: sum(cartTable.subtotal) })
      .from(cartTable)
      .where(eq(cartTable.customerId, customerId));

    const newTotal = total + subtotal;

    // 3) insert into cart
    const [newEntry] = await db
      .insert(cartTable)
      .values({
        customerId,
        productId,
        quantity,
        subtotal,
        total: newTotal,
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch a customer’s cart (with product info)
app.get('/api/customers/:customerId/cart', async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const rows = await db
      .select()
      .from(cartTable)
      .innerJoin(
        productTable,
        eq(cartTable.productId, productTable.productId)
      )
      .where(eq(cartTable.customerId, customerId));

    // flatten so each item has name, subtotal, etc.
    const cartItems = rows.map(r => ({
      cartId: r.cartTable.cartId,
      productId: r.productTable.productId,
      name: r.productTable.name,
      quantity: r.cartTable.quantity,
      subtotal: r.cartTable.subtotal,
    }));
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm sale and clear the cart
app.post('/api/sells', async (req, res) => {
  try {
    const { customerId, shopId } = req.body;
    if (!customerId || !shopId) {
      return res
        .status(400)
        .json({ error: 'customerId and shopId are required' });
    }

    // 1) pull all cart items for this customer
    const cartItems = await db
      .select()
      .from(cartTable)
      .where(eq(cartTable.customerId, customerId));
    const totalAmount = cartItems.reduce(
      (sum, c) => sum + parseFloat(c.subtotal),
      0
    );

    // 2) insert into sell
    const [sale] = await db
      .insert(sellTable)
      .values({ customerId, shopId, totalAmount })
      .returning();

    // 3) clear out cart
    await db.delete(cartTable).where(eq(cartTable.customerId, customerId));

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error confirming sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Error handling middleware for file uploads
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Start server
app.listen(PORT, () => {
  console.log("Server is running on port:", PORT);
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }
});
