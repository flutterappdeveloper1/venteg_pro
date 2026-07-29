import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  query,
  where,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { Product, Order, SubAdmin, Expense } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './initialData';

// Firestore collections references
const productsCol = collection(db, 'products');
const ordersCol = collection(db, 'orders');
const subAdminsCol = collection(db, 'subAdmins');
const expensesCol = collection(db, 'expenses');

// --- SEED DATA FUNCTION ---
export async function seedDatabaseIfEmpty() {
  try {
    // Delete any old demo data if still present in Firestore to clean it up for the user
    const demoProdIds = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 'prod-7', 'prod-8'];
    const demoOrderIds = ['order-101', 'order-102', 'order-103'];
    
    const batch = writeBatch(db);
    demoProdIds.forEach(id => {
      batch.delete(doc(productsCol, id));
    });
    demoOrderIds.forEach(id => {
      batch.delete(doc(ordersCol, id));
    });
    await batch.commit();
    console.log('Demo products and orders successfully cleaned up from Firestore.');

    const productsSnap = await getDocs(productsCol);
    if (productsSnap.empty && INITIAL_PRODUCTS.length > 0) {
      console.log('Seeding initial products to Firestore...');
      const batchProd = writeBatch(db);
      INITIAL_PRODUCTS.forEach((prod) => {
        const docRef = doc(productsCol, prod.id);
        batchProd.set(docRef, prod);
      });
      await batchProd.commit();
    }

    const ordersSnap = await getDocs(ordersCol);
    if (ordersSnap.empty && INITIAL_ORDERS.length > 0) {
      console.log('Seeding initial orders to Firestore...');
      const batchOrd = writeBatch(db);
      INITIAL_ORDERS.forEach((order) => {
        const docRef = doc(ordersCol, order.id);
        batchOrd.set(docRef, order);
      });
      await batchOrd.commit();
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// --- PRODUCTS API ---
export function subscribeProducts(callback: (products: Product[]) => void) {
  return onSnapshot(productsCol, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push(doc.data() as Product);
    });
    callback(products);
  }, (err) => {
    console.error('Error subscribing to products:', err);
  });
}

export async function addProduct(product: Product) {
  await setDoc(doc(productsCol, product.id), product);
}

export async function updateProductStock(productId: string, newStock: number, totalAddedQty: number) {
  const docRef = doc(productsCol, productId);
  await updateDoc(docRef, {
    stock: newStock,
    totalAddedQuantity: totalAddedQty
  });
}

export async function deleteProduct(productId: string) {
  await deleteDoc(doc(productsCol, productId));
}

export async function updateProduct(productId: string, updatedFields: Partial<Product>) {
  const docRef = doc(productsCol, productId);
  await updateDoc(docRef, updatedFields);
}

// --- ORDERS API ---
export function subscribeOrders(callback: (orders: Order[]) => void) {
  return onSnapshot(ordersCol, (snapshot) => {
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      orders.push(doc.data() as Order);
    });
    // Sort by createdAt desc manually or let client handle
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(orders);
  }, (err) => {
    console.error('Error subscribing to orders:', err);
  });
}

export async function addOrder(order: Order) {
  await setDoc(doc(ordersCol, order.id), order);
}

export async function updateOrderStatus(orderId: string, status: Order['status'], productUpdate?: { productId: string, newStock: number }) {
  const batch = writeBatch(db);
  
  // 1. Update order status
  const orderRef = doc(ordersCol, orderId);
  batch.update(orderRef, { status });

  // 2. If product stock needs decrementing, add it to batch
  if (productUpdate) {
    const productRef = doc(productsCol, productUpdate.productId);
    batch.update(productRef, { stock: productUpdate.newStock });
  }

  await batch.commit();
}

// --- SUB-ADMINS API ---
export function subscribeSubAdmins(callback: (subAdmins: SubAdmin[]) => void) {
  return onSnapshot(subAdminsCol, (snapshot) => {
    const subAdmins: SubAdmin[] = [];
    snapshot.forEach((doc) => {
      subAdmins.push(doc.data() as SubAdmin);
    });
    callback(subAdmins);
  }, (err) => {
    console.error('Error subscribing to subAdmins:', err);
  });
}

export async function addSubAdmin(email: string, addedBy: string) {
  const docId = email.toLowerCase().trim();
  const subAdmin: SubAdmin = {
    email: email.toLowerCase().trim(),
    addedAt: new Date().toISOString(),
    addedBy
  };
  await setDoc(doc(subAdminsCol, docId), subAdmin);
}

export async function removeSubAdmin(email: string) {
  const docId = email.toLowerCase().trim();
  await deleteDoc(doc(subAdminsCol, docId));
}

// --- RESET ALL DATA ---
export async function resetFirestoreData() {
  // Delete all products
  const productsSnap = await getDocs(productsCol);
  const prodBatch = writeBatch(db);
  productsSnap.forEach((doc) => {
    prodBatch.delete(doc.ref);
  });
  await prodBatch.commit();

  // Delete all orders
  const ordersSnap = await getDocs(ordersCol);
  const orderBatch = writeBatch(db);
  ordersSnap.forEach((doc) => {
    orderBatch.delete(doc.ref);
  });
  await orderBatch.commit();

  // Delete all expenses
  const expensesSnap = await getDocs(expensesCol);
  const expenseBatch = writeBatch(db);
  expensesSnap.forEach((doc) => {
    expenseBatch.delete(doc.ref);
  });
  await expenseBatch.commit();

  // Re-seed
  await seedDatabaseIfEmpty();
}

// --- NOTIFICATIONS & FCM TOKENS API ---
const tokensCol = collection(db, 'notification_tokens');
const notificationsCol = collection(db, 'notifications');

export interface SavedToken {
  token: string;
  email: string;
  role: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  title: string;
  body: string;
  targetRole: 'admin' | 'customer' | 'all';
  targetEmail?: string | null;
  createdAt: string;
  readBy: string[];
}

export async function saveTokenToFirestore(token: string, email?: string, role: string = 'customer') {
  const docId = token.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_'); // safe ID for Firestore
  const savedToken: SavedToken = {
    token,
    email: email || 'anonymous',
    role,
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(tokensCol, docId), savedToken);
}

export async function getNotificationTokens(): Promise<SavedToken[]> {
  const snap = await getDocs(tokensCol);
  const tokens: SavedToken[] = [];
  snap.forEach((doc) => {
    tokens.push(doc.data() as SavedToken);
  });
  return tokens;
}

export async function addNotificationLog(
  title: string, 
  body: string, 
  targetRole: 'admin' | 'customer' | 'all', 
  targetEmail?: string | null
) {
  const id = 'notif-' + Date.now();
  const notif: NotificationLog = {
    id,
    title,
    body,
    targetRole,
    targetEmail: targetEmail || null,
    createdAt: new Date().toISOString(),
    readBy: []
  };
  await setDoc(doc(notificationsCol, id), notif);
}

export function subscribeNotifications(callback: (notifications: NotificationLog[]) => void) {
  const q = query(notificationsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const notifs: NotificationLog[] = [];
    snapshot.forEach((doc) => {
      notifs.push(doc.data() as NotificationLog);
    });
    callback(notifs);
  }, (err) => {
    console.error('Error subscribing to notifications:', err);
  });
}

// --- EXPENSES API ---
export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(expensesCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      expenses.push(doc.data() as Expense);
    });
    callback(expenses);
  }, (err) => {
    console.error('Error subscribing to expenses:', err);
  });
}

export async function addExpense(expense: Expense) {
  await setDoc(doc(expensesCol, expense.id), expense);
}

export async function deleteExpense(expenseId: string) {
  await deleteDoc(doc(expensesCol, expenseId));
}

// --- CATEGORIES API ---
const categoriesCol = collection(db, 'categories');

export function subscribeCategories(callback: (categories: string[]) => void) {
  return onSnapshot(categoriesCol, (snapshot) => {
    const cats: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data && data.name) {
        cats.push(data.name);
      }
    });
    
    // If empty in Firestore, use default fallback categories
    if (cats.length === 0) {
      callback(['মিষ্টি জাতীয়', 'কোমল পানীয়', 'অন্যান্য']);
    } else {
      // Sort alphabetically or keep a custom order, putting 'অন্যান্য' at the end
      const hasOthers = cats.includes('অন্যান্য');
      const filtered = cats.filter(c => c !== 'অন্যান্য');
      filtered.sort();
      if (hasOthers) {
        filtered.push('অন্যান্য');
      } else {
        filtered.push('অন্যান্য'); // Always ensure "অন্যান্য" is at the end
      }
      callback(filtered);
    }
  }, (err) => {
    console.error('Error subscribing to categories:', err);
  });
}

export async function addCategory(categoryName: string) {
  const docId = categoryName.trim();
  if (!docId) return;
  await setDoc(doc(categoriesCol, docId), { name: docId, createdAt: new Date().toISOString() });
}

export async function deleteCategory(categoryName: string) {
  const docId = categoryName.trim();
  if (!docId) return;
  await deleteDoc(doc(categoriesCol, docId));
}



