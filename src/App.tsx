import React, { useState, useEffect } from 'react';
import { Product, Order, SubAdmin, Expense } from './types';
import AdminPanel from './components/AdminPanel';
import CustomerPanel from './components/CustomerPanel';
import AuthModal from './components/AuthModal';
import { auth, VAPID_KEY, getMessagingInstance } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  seedDatabaseIfEmpty,
  subscribeProducts,
  subscribeOrders,
  subscribeSubAdmins,
  subscribeExpenses,
  addProduct,
  updateProductStock,
  deleteProduct,
  updateProduct,
  addOrder,
  updateOrderStatus,
  addSubAdmin,
  removeSubAdmin,
  resetFirestoreData,
  addNotificationLog,
  subscribeNotifications,
  saveTokenToFirestore,
  addExpense,
  deleteExpense,
  NotificationLog,
  subscribeCategories,
  addCategory,
  deleteCategory
} from './firebaseService';
import { 
  Store, ShieldCheck, ShoppingBag, Info, LogIn, LogOut, Lock, 
  UserCheck, ShieldAlert, Bell, BellRing, Volume2, VolumeX, X, Copy, CheckCheck,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>(['মিষ্টি জাতীয়', 'কোমল পানীয়', 'অন্যান্য']);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [showWelcomeTip, setShowWelcomeTip] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [latestToast, setLatestToast] = useState<NotificationLog | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showNotificationHistory, setShowNotificationHistory] = useState<boolean>(false);
  const [lastReadId, setLastReadId] = useState<string>(() => localStorage.getItem('venteg_last_read_notif') || '');
  
  const [fcmToken, setFcmToken] = useState<string>(() => localStorage.getItem('venteg_fcm_token') || '');
  const [notificationPermission, setNotificationPermission] = useState<string>(() => 
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Determine user roles
  const isMainAdmin = currentUser?.email === 'ventegksy@gmail.com';
  const isSubAdmin = subAdmins.some(
    (sa) => sa.email.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()
  );
  const isAdmin = isMainAdmin || isSubAdmin;

  // Set up Firebase and Firestore subscriptions
  useEffect(() => {
    // 1. Seed database if it's completely empty
    seedDatabaseIfEmpty();

    // 2. Auth state subscription
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // 3. Products real-time subscription
    const unsubProducts = subscribeProducts((data) => {
      setProducts(data);
    });

    // 4. Orders real-time subscription
    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
    });

    // 5. Sub-admins real-time subscription
    const unsubSubAdmins = subscribeSubAdmins((data) => {
      setSubAdmins(data);
    });

    // 5.5 Expenses real-time subscription
    const unsubExpenses = subscribeExpenses((data) => {
      setExpenses(data);
    });

    // 5.7 Categories real-time subscription
    const unsubCategories = subscribeCategories((data) => {
      setCategories(data);
    });

    // 6. Notifications real-time subscription with live Toast triggers
    let isFirstLoad = true;
    const unsubNotifications = subscribeNotifications((data) => {
      setNotifications(data);
      
      if (data.length > 0) {
        const latest = data[0];
        const ageMs = Date.now() - new Date(latest.createdAt).getTime();
        
        // Only trigger toast for very recent notifications (created within 15 seconds) to avoid alert on initial load
        if (!isFirstLoad && ageMs < 15000) {
          const userEmail = auth.currentUser?.email?.toLowerCase().trim();
          const userRole = isMainAdmin ? 'admin' : (isSubAdmin ? 'admin' : 'customer');
          
          const isTargeted = 
            latest.targetRole === 'all' || 
            latest.targetRole === userRole || 
            (latest.targetRole === 'customer' && latest.targetEmail?.toLowerCase().trim() === userEmail);
            
          if (isTargeted) {
            setLatestToast(latest);
            // Auto hide toast after 5.5 seconds
            setTimeout(() => {
              setLatestToast(null);
            }, 5500);

            // Native Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(latest.title, {
                body: latest.body,
                icon: '/favicon.ico'
              });
            }

            // Play notification sound
            if (soundEnabled) {
              const audio = new Audio('/notification.mp3');
              audio.play().catch((err) => {
                console.log('Audio file play failed/blocked, falling back to Web Audio synthesis:', err);
                // Graceful fallback to browser-synthesized pleasant two-tone chime!
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const playNote = (freq: number, start: number, duration: number) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.15, start);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                    osc.start(start);
                    osc.stop(start + duration);
                  };
                  playNote(523.25, audioCtx.currentTime, 0.15); // C5 (High clear chime)
                  playNote(659.25, audioCtx.currentTime + 0.12, 0.3); // E5
                } catch (e) {
                  console.log('Web Audio feedback failed:', e);
                }
              });
            }
          }
        }
      }
      isFirstLoad = false;
    });

    return () => {
      unsubAuth();
      unsubProducts();
      unsubOrders();
      unsubSubAdmins();
      unsubExpenses();
      unsubNotifications();
      unsubCategories();
    };
  }, [isMainAdmin, isSubAdmin, soundEnabled]);

  // If not admin, force activeTab to be 'customer'
  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('customer');
    }
  }, [isAdmin]);

  // Add Product
  const handleAddProduct = async (
    newProd: Omit<Product, 'id' | 'stock' | 'totalAddedQuantity'> & { initialStock: number }
  ) => {
    try {
      const product: Product = {
        id: 'prod-' + Date.now(),
        name: newProd.name,
        category: newProd.category,
        unit: newProd.unit,
        stock: newProd.initialStock,
        totalAddedQuantity: newProd.initialStock,
        costPrice: newProd.costPrice,
        sellingPrice: newProd.sellingPrice,
      };
      await addProduct(product);
    } catch (error) {
      console.error("Error adding product: ", error);
      alert("পণ্যটি যুক্ত করতে সমস্যা হয়েছে! অনুগ্রহ করে আবার চেষ্টা করুন।");
    }
  };

  // Add stock to existing product
  const handleAddStock = async (productId: string, quantity: number) => {
    try {
      const product = products.find((p) => p.id === productId);
      if (product) {
        const newStock = product.stock + quantity;
        const totalAddedQty = product.totalAddedQuantity + quantity;
        await updateProductStock(productId, newStock, totalAddedQty);
        alert("স্টক সফলভাবে বৃদ্ধি করা হয়েছে! 🎉");
      }
    } catch (error: any) {
      console.error("Error adding stock: ", error);
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
        alert(
          "দুঃখিত! স্টক বাড়ানোর জন্য ফায়ারবেস পারমিশন বাধা দিচ্ছে (Permission Denied)।\n\n" +
          "সমাধানের জন্য অনুগ্রহ করে Firebase Console-এ যান (https://console.firebase.google.com/) এবং:\n" +
          "১. Build > Firestore Database > Rules ট্যাবে যান।\n" +
          "২. Rules-এ নিচের কোডটি বসিয়ে দিয়ে Publish বাটনে ক্লিক করুন:\n\n" +
          "rules_version = '2';\n" +
          "service cloud.firestore {\n" +
          "  match /databases/{database}/documents {\n" +
          "    match /{document=**} {\n" +
          "      allow read, write: if true;\n" +
          "    }\n" +
          "  }\n" +
          "}"
        );
      } else {
        alert(`স্টক বাড়াতে সমস্যা হয়েছে: ${error.message || error}`);
      }
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      alert("পণ্যটি সফলভাবে মুছে ফেলা হয়েছে! 🗑️");
    } catch (error: any) {
      console.error("Error deleting product: ", error);
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
        alert(
          "দুঃখিত! পণ্যটি ডিলিট করতে ফায়ারবেস পারমিশন বাধা দিচ্ছে (Permission Denied)।\n\n" +
          "সমাধানের জন্য অনুগ্রহ করে Firebase Console-এ যান (https://console.firebase.google.com/) এবং:\n" +
          "১. Build > Firestore Database > Rules ট্যাবে যান।\n" +
          "২. Rules-এ নিচের কোডটি বসিয়ে দিয়ে Publish বাটনে ক্লিক করুন:\n\n" +
          "rules_version = '2';\n" +
          "service cloud.firestore {\n" +
          "  match /databases/{database}/documents {\n" +
          "    match /{document=**} {\n" +
          "      allow read, write: if true;\n" +
          "    }\n" +
          "  }\n" +
          "}\n\n" +
          `[নির্দিষ্ট ত্রুটি বার্তা: ${error.code || 'unknown'} - ${error.message || ''}]`
        );
      } else {
        alert(`পণ্যটি ডিলিট করতে সমস্যা হয়েছে: ${error.message || error}`);
      }
    }
  };

  // Edit product details
  const handleEditProduct = async (productId: string, updatedFields: Partial<Product>) => {
    try {
      await updateProduct(productId, updatedFields);
      alert("পণ্যটি সফলভাবে সংশোধন করা হয়েছে! 📝");
    } catch (error: any) {
      console.error("Error editing product: ", error);
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
        alert(
          "দুঃখিত! পণ্যটি সংশোধন করতে ফায়ারবেস পারমিশন বাধা দিচ্ছে (Permission Denied)।\n\n" +
          "সমাধানের জন্য অনুগ্রহ করে Firebase Console-এ যান (https://console.firebase.google.com/) এবং:\n" +
          "Rules ট্যাবে রিড ও রাইট পারমিশন চেক করুন।"
        );
      } else {
        alert(`পণ্যটি সংশোধন করতে সমস্যা হয়েছে: ${error.message || error}`);
      }
    }
  };

  // Add other expense
  const handleAddExpense = async (title: string, amount: number) => {
    try {
      const newExpense: Expense = {
        id: 'exp-' + Date.now(),
        title: title.trim(),
        amount: amount,
        createdAt: new Date().toISOString(),
        addedBy: currentUser?.email || 'admin'
      };
      await addExpense(newExpense);
    } catch (error: any) {
      console.error("Error adding expense: ", error);
      alert(`খরচ যুক্ত করতে সমস্যা হয়েছে: ${error.message || error}`);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
    } catch (error: any) {
      console.error("Error deleting expense: ", error);
      alert(`খরচ মুছতে সমস্যা হয়েছে: ${error.message || error}`);
    }
  };


  // Update order status (and handle inventory changes)
  const handleUpdateOrderStatus = async (orderId: string, status: 'delivered' | 'cancelled') => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (status === 'delivered') {
      const product = products.find((p) => p.id === order.productId);
      if (product) {
        if (product.stock < order.quantity) {
          alert(
            `পর্যাপ্ত স্টক নেই! আপনার স্টকে আছে ${product.stock} ${
              product.unit === 'kg' ? 'কেজি' : 'পিস'
            }, কিন্তু অর্ডার এসেছে ${order.quantity} ${
              product.unit === 'kg' ? 'কেজি' : 'পিস'
            }। অনুগ্রহ করে প্রোডাক্টের স্টক বাড়িয়ে পুনরায় চেষ্টা করুন।`
          );
          return;
        } else {
          // Decrement product stock inside a Firestore batch
          const newStock = product.stock - order.quantity;
          await updateOrderStatus(orderId, status, {
            productId: product.id,
            newStock,
          });
          
          // Log notification for the customer
          addNotificationLog(
            'অর্ডার ডেলিভারি করা হয়েছে! 🎉',
            `আপনার অর্ডার #${orderId} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!`,
            'customer',
            order.customerEmail
          ).catch(e => console.error(e));
        }
      } else {
        alert('এই প্রোডাক্টটি দোকান থেকে সরিয়ে ফেলা হয়েছে!');
        return;
      }
    } else {
      await updateOrderStatus(orderId, status);
      
      // Log notification for the customer
      addNotificationLog(
        'অর্ডার বাতিল করা হয়েছে ⚠️',
        `আপনার অর্ডার #${orderId} দুঃখজনকভাবে বাতিল করা হয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।`,
        'customer',
        order.customerEmail
      ).catch(e => console.error(e));
    }
  };

  // Place customer order
  const handlePlaceOrder = (newOrder: Omit<Order, 'id' | 'status' | 'createdAt'>): string => {
    const orderId = 'order-' + Math.floor(100 + Math.random() * 900); // Friendly 3 digit suffix ID
    const order: Order = {
      ...newOrder,
      id: orderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerEmail: currentUser?.email || undefined, // Associate with logged in customer
    };

    // Execute firestore write in background
    addOrder(order)
      .then(() => {
        // Send real-time notification to all admins
        addNotificationLog(
          'নতুন অর্ডার এসেছে! 🛒',
          `${newOrder.customerName} একটি নতুন অর্ডার সাবমিট করেছেন। অর্ডার আইডি: #${orderId}, মোট মূল্য: ৳${newOrder.totalPrice}`,
          'admin'
        ).catch(e => console.error(e));

        // Send instant notification to Telegram Bot
        const paymentDetailsText = newOrder.paymentMethod === 'online'
          ? `\n<b>পেমেন্ট:</b> অনলাইন (নম্বর: ${newOrder.paymentNumber || 'N/A'}, TrxID: ${newOrder.trxId || 'N/A'})`
          : `\n<b>পেমেন্ট:</b> ক্যাশ অন ডেলিভারি (COD)`;

        const telegramMsg = `🛒 <b>নতুন অর্ডার এসেছে!</b>\n\n<b>গ্রাহক:</b> ${newOrder.customerName}\n<b>ফোন:</b> ${newOrder.customerPhone}\n<b>পণ্য:</b> ${newOrder.productName} (${newOrder.quantity} টি)\n<b>মোট মূল্য:</b> ৳${newOrder.totalPrice}${paymentDetailsText}\n<b>অর্ডার আইডি:</b> #${orderId}\n<b>ঠিকানা:</b> ${newOrder.customerAddress}`;

        fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: telegramMsg
          })
        }).catch(() => {
          // Fallback directly to Telegram Bot HTTP API if server endpoint is unavailable (e.g. Vercel static deployment)
          const botToken = "8796371486:AAF2OEA79DF15NflP0OcMBZ8tD4wdoqT9-k";
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: "@venteg_bot",
              text: telegramMsg,
              parse_mode: 'HTML'
            })
          }).catch(err => console.error('Error sending direct Telegram order alert:', err));
        });
      })
      .catch((err) => console.error('Error placing order:', err));
      
    return orderId;
  };

  // Reset database
  const handleResetData = async () => {
    try {
      await resetFirestoreData();
      alert('সফলভাবে রিসেট সম্পূর্ণ হয়েছে! 🎉');
    } catch (e: any) {
      console.error('Error resetting database:', e);
      alert('ডাটা রিসেট করতে সমস্যা হয়েছে: ' + (e.message || e));
    }
  };

  // Add sub admin (triggered by main admin)
  const handleAddSubAdmin = async (email: string) => {
    if (!currentUser) return;
    await addSubAdmin(email, currentUser.email || 'Admin');
  };

  // Remove sub admin (triggered by main admin)
  const handleRemoveSubAdmin = async (email: string) => {
    await removeSubAdmin(email);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('customer'); // Default back to customer panel
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Handle Register Push Notifications
  const handleRegisterPush = async () => {
    if (!('Notification' in window)) {
      alert('আপনার ব্রাউজারটি পুশ নোটিফিকেশন সাপোর্ট করে না।');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        alert('নোটিফিকেশন অনুমতি প্রত্যাখ্যান করা হয়েছে। দয়া করে ব্রাউজার সেটিংস থেকে অনুমতি দিন।');
        return;
      }

      const messaging = await getMessagingInstance();
      if (!messaging) {
        alert('সতর্কতা: আইফ্রেম সিকিউরিটি রেস্ট্রিকশনের কারণে FCM ইনিশিয়ালাইজ করা যায়নি। তবে আপনি রিয়েল-টাইম ইন-অ্যাপ নোটিফিকেশন পাবেন!');
        return;
      }

      const { getToken } = await import('firebase/messaging');

      // Register or get active service worker registration
      let reg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .catch(err => {
            console.warn('Service worker registration failed:', err);
            return undefined;
          });
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg
      });

      if (token) {
        setFcmToken(token);
        localStorage.setItem('venteg_fcm_token', token);
        const userEmail = currentUser?.email || 'anonymous';
        const userRole = isMainAdmin ? 'admin' : (isSubAdmin ? 'admin' : 'customer');
        await saveTokenToFirestore(token, userEmail, userRole);
        alert('সাফল্য! পুশ নোটিফিকেশন সফলভাবে চালু এবং রেজিস্টার করা হয়েছে।');
      } else {
        alert('পুশ টোকেন তৈরি করা যায়নি। তবে ইন-অ্যাপ নোটিফিকেশন কাজ করবে।');
      }
    } catch (error: any) {
      console.error('Push registration error:', error);
      alert(`নোটিফিকেশন সংযোগ করতে সমস্যা হয়েছে: ${error.message || error}`);
    }
  };

  const handleOpenHistory = () => {
    setShowNotificationHistory(true);
    if (notifications.length > 0) {
      const latestId = notifications[0].id;
      setLastReadId(latestId);
      localStorage.setItem('venteg_last_read_notif', latestId);
    }
  };

  const unreadCount = notifications.filter(n => {
    const userEmail = currentUser?.email?.toLowerCase().trim();
    const userRole = isMainAdmin ? 'admin' : (isSubAdmin ? 'admin' : 'customer');
    const isTargeted = 
      n.targetRole === 'all' || 
      n.targetRole === userRole || 
      (n.targetRole === 'customer' && n.targetEmail?.toLowerCase().trim() === userEmail);
      
    if (!isTargeted) return false;
    
    if (!lastReadId) return true;
    
    const lastReadIndex = notifications.findIndex(notif => notif.id === lastReadId);
    const currentIndex = notifications.findIndex(notif => notif.id === n.id);
    
    if (lastReadIndex === -1) return true;
    return currentIndex < lastReadIndex;
  }).length;


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col justify-between" id="app-root-container">
      
      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-xs" id="main-app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2" id="brand-logo-container">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                venteg
                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-normal">PRO</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-semibold tracking-wide uppercase">দোকান ব্যবস্থাপনা ও কাস্টমার প্যানেল</p>
            </div>
          </div>

          {/* User Auth Status / Control */}
          <div className="flex flex-wrap items-center gap-2" id="header-controls">
            
            {/* Get App Option */}
            <a
              href="https://drive.google.com/file/d/1-jaXhada0woci3GpMfVbbKtJW7dKh13w/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-all duration-150 shadow-xs border border-indigo-500/10 cursor-pointer hover:scale-[1.02] active:scale-95"
              id="go-to-app-header-link"
              title="আমাদের মোবাইল অ্যাপ ডাউনলোড করুন"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-100 animate-pulse" />
              <span>Get App</span>
            </a>
            
            {/* Logged in info */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 py-1 pl-2 pr-1.5 rounded-lg text-[11px] font-bold text-slate-600" id="user-info-pill">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="max-w-[120px] sm:max-w-none truncate">
                  {currentUser.displayName || (currentUser.email && currentUser.email.endsWith('@phone.venteg') ? currentUser.email.replace('@phone.venteg', '') : currentUser.email)}
                </span>
                {isMainAdmin && (
                  <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm">মেইন এডমিন</span>
                )}
                {isSubAdmin && (
                  <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm">সাব-এডমিন</span>
                )}
                <button
                  onClick={handleLogout}
                  className="p-1 rounded-md hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                  title="লগআউট করুন"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                লগইন / সাইন আপ
              </button>
            )}

            {/* Real-time Notifications Header Utilities */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 ml-1" id="notifications-header-utils">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  soundEnabled 
                    ? 'bg-indigo-50 border-indigo-150 text-indigo-600 hover:bg-indigo-100' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
                title={soundEnabled ? "মিউট করুন (সাউন্ড অন)" : "আনমিউট করুন (সাউন্ড অফ)"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Notification Bell */}
              <button
                onClick={handleOpenHistory}
                className="relative p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-all duration-150 cursor-pointer"
                title="নোটিফিকেশন সেন্টার"
                id="bell-icon-header"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Role switcher toggle */}
            {isAdmin && (
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200" id="role-switcher">
                <button
                  id="btn-switch-customer"
                  onClick={() => {
                    setActiveTab('customer');
                    setShowWelcomeTip(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.2 rounded-md text-xs font-bold transition-all duration-150 ${
                    activeTab === 'customer'
                      ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  আমি কাস্টমার
                </button>
                <button
                  id="btn-switch-admin"
                  onClick={() => {
                    setActiveTab('admin');
                    setShowWelcomeTip(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.2 rounded-md text-xs font-bold transition-all duration-150 ${
                    activeTab === 'admin'
                      ? 'bg-white text-slate-950 shadow-xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  আমি অ্যাডমিন
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4" id="main-content-section">
        <AnimatePresence mode="wait">
          {activeTab === 'customer' ? (
            <motion.div
              key="customer-panel"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <CustomerPanel 
                products={products}
                orders={orders}
                onPlaceOrder={handlePlaceOrder}
                currentUser={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
                categories={categories}
                onAddCategory={addCategory}
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {isAdmin ? (
                <AdminPanel 
                  products={products}
                  orders={orders}
                  subAdmins={subAdmins}
                  isMainAdmin={isMainAdmin}
                  onAddProduct={handleAddProduct}
                  onAddStock={handleAddStock}
                  onDeleteProduct={handleDeleteProduct}
                  onEditProduct={handleEditProduct}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onResetData={handleResetData}
                  onAddSubAdmin={handleAddSubAdmin}
                  onRemoveSubAdmin={handleRemoveSubAdmin}
                  fcmToken={fcmToken}
                  notificationPermission={notificationPermission}
                  onRegisterPush={handleRegisterPush}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled(!soundEnabled)}
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  categories={categories}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                />
              ) : (
                /* Beautiful restricted access state */
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md max-w-md mx-auto p-8 text-center space-y-6 my-10" id="admin-locked-card">
                  <div className="relative w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto" id="lock-icon-container">
                    <div className="absolute inset-0 rounded-full border border-rose-100 animate-ping opacity-75"></div>
                    <Lock className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">অ্যাডমিন অ্যাক্সেস সীমাবদ্ধ 🔐</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      আপনি বর্তমানে অ্যাডমিন হিসেবে অনুমোদিত নন। এই প্যানেলটি শুধুমাত্র দোকান পরিচালক ও সাব-অ্যাডমিনদের জন্য সংরক্ষিত।
                    </p>
                    {currentUser && (
                      <div className="flex items-center gap-1.5 justify-center p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-[11px] font-bold mt-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>লগইন অ্যাকাউন্ট: {currentUser.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    {currentUser ? (
                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          অ্যাডমিন অ্যাক্সেস পেতে দয়া করে লগআউট করে মেইন অ্যাডমিন ইমেইল <strong>ventegksy@gmail.com</strong> দিয়ে পুনরায় লগইন করুন।
                        </p>
                        <button
                          onClick={handleLogout}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          বর্তমান আইডি লগআউট করুন
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAuthModalOpen(true)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        অ্যাডমিন আইডিতে লগইন করুন
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Auth Modal overlay */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      {/* Real-time In-App Notification Toast Alert */}
      <AnimatePresence>
        {latestToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 flex items-start gap-3.5"
            id="notification-live-toast"
          >
            <div className="p-2 bg-indigo-600 rounded-xl shrink-0">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black tracking-tight">{latestToast.title}</h4>
                <button 
                  onClick={() => setLatestToast(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">{latestToast.body}</p>
              <span className="block text-[8px] text-slate-500 font-black uppercase pt-1">জাস্ট নাও • ইন-অ্যাপ নোটিফিকেশন</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Notification History Modal */}
      <AnimatePresence>
        {showNotificationHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" id="notif-history-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]"
              id="notif-history-modal"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">নোটিফিকেশন হিস্ট্রি 🔔</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">আপনার জন্য আসা সাম্প্রতিক বার্তাসমূহ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationHistory(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100 space-y-4">
                {notifications.filter(n => {
                  const userEmail = currentUser?.email?.toLowerCase().trim();
                  const userRole = isMainAdmin ? 'admin' : (isSubAdmin ? 'admin' : 'customer');
                  return n.targetRole === 'all' || 
                         n.targetRole === userRole || 
                         (n.targetRole === 'customer' && n.targetEmail?.toLowerCase().trim() === userEmail);
                }).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-xs font-bold">কোনো নোটিফিকেশন পাওয়া যায়নি!</p>
                  </div>
                ) : (
                  notifications.filter(n => {
                    const userEmail = currentUser?.email?.toLowerCase().trim();
                    const userRole = isMainAdmin ? 'admin' : (isSubAdmin ? 'admin' : 'customer');
                    return n.targetRole === 'all' || 
                           n.targetRole === userRole || 
                           (n.targetRole === 'customer' && n.targetEmail?.toLowerCase().trim() === userEmail);
                  }).map((notif) => (
                    <div key={notif.id} className="pt-3.5 first:pt-0 space-y-1.5" id={`notif-item-${notif.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 block leading-tight">{notif.title}</span>
                        <span className="text-[9px] text-slate-400 font-bold shrink-0">{new Date(notif.createdAt).toLocaleTimeString('bn-BD', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{notif.body}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase">
                        <span>{new Date(notif.createdAt).toLocaleDateString('bn-BD')}</span>
                        <span>•</span>
                        {notif.targetRole === 'admin' ? (
                          <span className="text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-extrabold">অ্যাডমিন বার্তা</span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-extrabold">গ্রাহক বার্তা</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (notifications.length > 0) {
                      const latestId = notifications[0].id;
                      setLastReadId(latestId);
                      localStorage.setItem('venteg_last_read_notif', latestId);
                    }
                    setShowNotificationHistory(false);
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCheck className="w-4 h-4" />
                  সকল পড়া হয়েছে বলে চিহ্নিত করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Aesthetic footer */}
      <footer className="border-t border-gray-100 py-6 mt-12 bg-white text-center text-xs text-gray-400 font-medium" id="main-app-footer">
        <p>© {new Date().getFullYear()} venteg লিমিটেড। তৈরি করা হয়েছে দোকান ব্যবস্থাপনা সহজ করতে।</p>
      </footer>
    </div>
  );
}
