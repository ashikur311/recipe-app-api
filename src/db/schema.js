import { pgTable, serial, text, integer, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User Info Table
export const userInfoTable = pgTable('user_info', {
  userId: text('user_id').primaryKey(),
  username: text('username'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  image: text('image'), // Removed .nullable()
});

// Shop Table
export const shopTable = pgTable('shop', {
  shopId: serial('shop_id').primaryKey(),
  shopName: text('shop_name'),
  location: text('location'),
  type: text('type'),
  status: text('status').default('active'),
  shopImage: text('shop_image'),
  ownerId: text('owner_id').references(() => userInfoTable.userId), // Foreign key to user_info
});

// Shop Owner Table (foreign keys to `shop` and `user_info`)
export const shopOwnerTable = pgTable('shop_owner', {
  shopOwnerId: serial('shop_owner_id').primaryKey(),
  shopId: integer('shop_id').references(() => shopTable.shopId),
  userId: text('user_id').references(() => userInfoTable.userId), // Foreign key to user_info
});

// Product Table
export const productTable = pgTable('product', {
  productId: serial('product_id').primaryKey(),
  shopId: integer('shop_id').references(() => shopTable.shopId), // Foreign key to shop
  name: text('name'),
  price: numeric('price'),
  quantity: integer('quantity'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cart Table (foreign keys to `customer` and `product`)
export const cartTable = pgTable('cart', {
  cartId: serial('cart_id').primaryKey(),
  customerId: integer('customer_id').references(() => customerTable.customerId),
  productId: integer('product_id').references(() => productTable.productId),
  quantity: integer('quantity'),
  subtotal: numeric('subtotal'),
  total: numeric('total'),
});

// Sell Table (to save the final sale information)
export const sellTable = pgTable('sell', {
  sellId: serial('sell_id').primaryKey(),
  cartId: integer('cart_id').references(() => cartTable.cartId), // Foreign key to cart
  shopId: integer('shop_id').references(() => shopTable.shopId), // Foreign key to shop
  customerId: integer('customer_id').references(() => customerTable.customerId), // Foreign key to customer
  totalAmount: numeric('total_amount'),
  dateOfSale: timestamp('date_of_sale').defaultNow(),
});

// Expense Table (to track expenses for shops)
export const expenseTable = pgTable('expense', {
  expenseId: serial('expense_id').primaryKey(),
  shopId: integer('shop_id').references(() => shopTable.shopId), // Foreign key to shop
  amount: numeric('amount'),
  description: text('description'),
  expenseDate: timestamp('expense_date').defaultNow(),
});

// Order Table (to track orders placed by shops)
export const orderTable = pgTable('order', {
  orderId: serial('order_id').primaryKey(),
  shopId: integer('shop_id').references(() => shopTable.shopId), // Foreign key to shop
  productId: integer('product_id').references(() => productTable.productId), // Foreign key to product
  quantity: integer('quantity'),
  totalAmount: numeric('total_amount'),
  orderDate: timestamp('order_date').defaultNow(),
  status: text('status').default('pending'),
});

// Customer Table
export const customerTable = pgTable('customer', {
  customerId: serial('customer_id').primaryKey(),
  mobile: text('mobile'),
});

// Shop-Customer Join Table (Many-to-Many Relationship between Shop and Customer)
export const shopCustomerTable = pgTable('shop_customer', {
  shopId: integer('shop_id').references(() => shopTable.shopId),
  customerId: integer('customer_id').references(() => customerTable.customerId),
  createdAt: timestamp('created_at').defaultNow(),
});

// Defining relations for user info
export const userInfoRelations = relations(userInfoTable, ({ many }) => ({
  shopsOwned: many(shopTable),
}));

// Defining relations for shop
export const shopRelations = relations(shopTable, ({ one, many }) => ({
  owner: one(userInfoTable, { fields: [shopTable.ownerId], references: [userInfoTable.userId] }),
  products: many(productTable),
  orders: many(orderTable),
  sales: many(sellTable),
  expenses: many(expenseTable),
  customers: many(customerTable, { through: shopCustomerTable }),
}));

// Defining relations for product
export const productRelations = relations(productTable, ({ many }) => ({
  orders: many(orderTable),
}));

// Defining relations for cart
export const cartRelations = relations(cartTable, ({ one }) => ({
  sell: one(sellTable),
}));

// Defining relations for sell
export const sellRelations = relations(sellTable, ({ one }) => ({
  cart: one(cartTable),
  shop: one(shopTable),
  customer: one(customerTable),
}));

// Defining relations for expense
export const expenseRelations = relations(expenseTable, ({ one }) => ({
  shop: one(shopTable),
}));

// Defining relations for order
export const orderRelations = relations(orderTable, ({ one }) => ({
  shop: one(shopTable),
  product: one(productTable),
}));

// Defining relations for shop_customer
export const shopCustomerRelations = relations(shopCustomerTable, ({ one }) => ({
  shop: one(shopTable),
  customer: one(customerTable),
}));
