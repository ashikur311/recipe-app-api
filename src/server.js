// Import necessary modules and tables
import express from "express";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
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
import { eq, and, or, like, gt, lt } from "drizzle-orm";

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

// ------------------- USER ENDPOINTS -------------------
//Insert New User
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

//Get User Info
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
//Create New Shop With Owner ID
app.post("/api/shops", async (req, res) => {
  try {
    const { shopName, location, type, shopImage, ownerId } = req.body;
    if (!shopName || !ownerId) {
      return res.status(400).json({ error: "shopName and ownerId are required" });
    }
    
    const newShop = await db.insert(shopTable).values({
      shopName,
      location,
      type,
      shopImage,
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


//Get Shop information by receving Owner Id
app.get("/api/shops/:ownerId", async (req, res) => {
  try {
    const { ownerId } = req.params; // Correctly destructure ownerId from params
    
    // Fetch shop by ownerId
    const shop = await db.select()
      .from(shopTable)
      .where(eq(shopTable.ownerId, ownerId));
    
    if (shop.length === 0) {
      return res.status(404).json({ error: "No shop found for this owner" });
    }
    
    // Return the first shop (assuming one owner can have only one shop)
    // If multiple shops are possible, you might want to return the array
    res.status(200).json(shop[0]);
  } catch (error) {
    console.error("Error fetching shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- PRODUCT ENDPOINTS -------------------

//Add new Products With the shopId
app.post("/api/products", async (req, res) => {
  try {
    const { shopId, name, price, quantity } = req.body;
    if (!shopId || !name || !price) {
      return res.status(400).json({ error: "shopId, name, and price are required" });
    }
    
    const newProduct = await db.insert(productTable).values({
      shopId,
      name,
      price,
      quantity
    }).returning();
    
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//Get Shpos Products Informations
app.get("/api/shops/:shopId/products", async (req, res) => {
  try {
    const { shopId } = req.params;
    const products = await db.select()
      .from(productTable)
      .where(eq(productTable.shopId, shopId));
    
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ------------------- CART ENDPOINTS -------------------


app.post("/api/carts", async (req, res) => {
  try {
    const { customerId, productId, quantity } = req.body;
    if (!customerId || !productId || !quantity) {
      return res.status(400).json({ error: "customerId, productId, and quantity are required" });
    }
    // Get product price
    const [product] = await db.select({ price: productTable.price })
      .from(productTable)
      .where(eq(productTable.productId, productId));
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const subtotal = product.price * quantity;
    
    const newCartItem = await db.insert(cartTable).values({
      customerId,
      productId,
      quantity,
      subtotal,
      total: subtotal // For single item, total = subtotal
    }).returning();
    
    res.status(201).json(newCartItem[0]);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/customers/:customerId/cart", async (req, res) => {
  try {
    const { customerId } = req.params;
    const cartItems = await db.select()
      .from(cartTable)
      .where(eq(cartTable.customerId, customerId));
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- ORDER ENDPOINTS -------------------
app.post("/api/orders", async (req, res) => {
  try {
    const { shopId, productId, quantity } = req.body;
    if (!shopId || !productId || !quantity) {
      return res.status(400).json({ error: "shopId, productId, and quantity are required" });
    }
    
    // Get product price
    const [product] = await db.select({ price: productTable.price })
      .from(productTable)
      .where(eq(productTable.productId, productId));
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const totalAmount = product.price * quantity;
    
    const newOrder = await db.insert(orderTable).values({
      shopId,
      productId,
      quantity,
      totalAmount
    }).returning();
    
    res.status(201).json(newOrder[0]);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/shops/:shopId/orders", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status } = req.query;
    
    let whereClause = eq(orderTable.shopId, shopId);
    if (status) {
      whereClause = and(whereClause, eq(orderTable.status, status));
    }
    
    const orders = await db.select()
      .from(orderTable)
      .where(whereClause);
    
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- SALE ENDPOINTS -------------------
app.post("/api/sales", async (req, res) => {
  try {
    const { cartId, shopId, customerId } = req.body;
    if (!cartId || !shopId || !customerId) {
      return res.status(400).json({ error: "cartId, shopId, and customerId are required" });
    }
    
    // Get cart total
    const [cart] = await db.select({ total: cartTable.total })
      .from(cartTable)
      .where(eq(cartTable.cartId, cartId));
    
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    const newSale = await db.insert(sellTable).values({
      cartId,
      shopId,
      customerId,
      totalAmount: cart.total
    }).returning();
    
    res.status(201).json(newSale[0]);
  } catch (error) {
    console.error("Error recording sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ------------------- CUSTOMER ENDPOINTS -------------------
app.post("/api/customers", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    
    const newCustomer = await db.insert(customerTable).values({
      mobile
    }).returning();
    
    res.status(201).json(newCustomer[0]);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- EXPENSE ENDPOINTS -------------------
app.post("/api/expenses", async (req, res) => {
  try {
    const { shopId, amount, description } = req.body;
    if (!shopId || !amount) {
      return res.status(400).json({ error: "shopId and amount are required" });
    }
    
    const newExpense = await db.insert(expenseTable).values({
      shopId,
      amount,
      description
    }).returning();
    
    res.status(201).json(newExpense[0]);
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("Server is running on port:", PORT);
});