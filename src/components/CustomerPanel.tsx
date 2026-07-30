import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Truck, CreditCard, CheckCircle2, 
  ArrowRight, Clock, User, Phone, MapPin, Sparkles, Filter, Home, Smartphone, Copy, Check,
  FolderPlus, X
} from 'lucide-react';
import { Product, Order, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { AiChatWidget } from './AiChatWidget';

interface CustomerPanelProps {
  products: Product[];
  orders: Order[];
  onPlaceOrder: (order: Omit<Order, 'id' | 'status' | 'createdAt'>) => string; // returns orderId
  currentUser: FirebaseUser | null;
  onOpenAuth: () => void;
  categories: string[];
  onAddCategory?: (category: string) => Promise<void>;
}

export default function CustomerPanel({ products, orders, onPlaceOrder, currentUser, onOpenAuth, categories, onAddCategory }: CustomerPanelProps) {
  // Navigation inside Customer Panel
  const [activeCustomerView, setActiveCustomerView] = useState<'shop' | 'tracking'>('shop');

  // Filter products
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Category addition modal
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [addingCatLoading, setAddingCatLoading] = useState(false);
  const [catAddSuccessMsg, setCatAddSuccessMsg] = useState('');

  const handleAddCategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newCatInput.trim();
    if (!val) return;

    if (categories.includes(val)) {
      setActiveCategory(val);
      setShowAddCatModal(false);
      setNewCatInput('');
      return;
    }

    setAddingCatLoading(true);
    try {
      if (onAddCategory) {
        await onAddCategory(val);
      }
      setActiveCategory(val);
      setCatAddSuccessMsg(`"${val}" ক্যাটাগরি সফলভাবে যুক্ত হয়েছে!`);
      setTimeout(() => setCatAddSuccessMsg(''), 3500);
      setShowAddCatModal(false);
      setNewCatInput('');
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setAddingCatLoading(false);
    }
  };

  // Tracking query state
  const [trackingPhoneQuery, setTrackingPhoneQuery] = useState('');

  // Selected product for ordering
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Checkout Form states
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [copiedNum, setCopiedNum] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const copyToClipboard = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(num);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  // Pre-populate name and phone if logged in
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.displayName) {
        setCustName(currentUser.displayName);
      }
      if (currentUser.email && currentUser.email.endsWith('@phone.venteg')) {
        const phoneNum = currentUser.email.replace('@phone.venteg', '');
        setCustPhone(phoneNum);
      }
    }
  }, [currentUser, selectedProduct]);

  // Success screen state
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState<string | null>(null);

  // Categories list ensuring 'অন্যান্য' is always available
  const baseCategories = categories.includes('অন্যান্য') ? categories : [...categories, 'অন্যান্য'];
  const customerCategories = ['all', ...baseCategories];

  // Total price for current selection
  const currentTotalPrice = selectedProduct ? (orderQuantity * selectedProduct.sellingPrice) : 0;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenOrderModal = (product: Product) => {
    if (product.stock <= 0) return;
    setSelectedProduct(product);
    setOrderQuantity(1);
    setCheckoutError('');
  };

  const handleQtyChange = (delta: number) => {
    if (!selectedProduct) return;
    const newQty = orderQuantity + delta;
    if (newQty > 0 && newQty <= selectedProduct.stock) {
      setOrderQuantity(newQty);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!custName.trim()) {
      setCheckoutError('আপনার নাম লিখুন!');
      return;
    }
    if (!custPhone.trim()) {
      setCheckoutError('মোবাইল নাম্বার লিখুন!');
      return;
    }
    // Simple Bangladeshi phone verification pattern
    if (!/^(01[3-9]\d{8})$/.test(custPhone.trim())) {
      setCheckoutError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 017xxxxxxxx)!');
      return;
    }
    if (!custAddress.trim()) {
      setCheckoutError('ডেলিভারি ঠিকানা লিখুন!');
      return;
    }
    if (orderQuantity <= 0 || orderQuantity > selectedProduct.stock) {
      setCheckoutError('অর্ডারের পরিমান পর্যাপ্ত স্টকের চেয়ে বেশি হতে পারে না!');
      return;
    }

    if (paymentMethod === 'online') {
      if (!paymentPhone.trim()) {
        setCheckoutError('অনলাইন পেমেন্টের জন্য আপনার সেন্ড মানি করা মোবাইল নম্বর লিখুন!');
        return;
      }
      if (!paymentTrxId.trim()) {
        setCheckoutError('অনলাইন পেমেন্টের ট্রানজেকশন আইডি (TrxID) প্রবেশ করান!');
        return;
      }
    }

    const newOrderId = onPlaceOrder({
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      customerAddress: custAddress.trim(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: orderQuantity,
      totalPrice: currentTotalPrice,
      paymentMethod: paymentMethod,
      ...(paymentMethod === 'online' ? {
        paymentNumber: paymentPhone.trim(),
        trxId: paymentTrxId.trim().toUpperCase()
      } : {})
    });

    setLastPlacedOrderId(newOrderId);
    setSelectedProduct(null);
  };

  // Close success modal & open tracking
  const handleViewOrderTracking = () => {
    setLastPlacedOrderId(null);
    setTrackingPhoneQuery(custPhone);
    setActiveCustomerView('tracking');
  };

  return (
    <div className="w-full space-y-6" id="customer-panel-container">
      {/* Banner / Header */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 rounded-3xl shadow-sm overflow-hidden" id="customer-header-banner">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
          <ShoppingBag className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-3 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            সেরা মূল্যে তাজা ও আসল পণ্য
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">আপনার প্রয়োজনীয় নিত্যদিনের বাজার এখন অনলাইনে!</h2>
          <p className="text-xs sm:text-sm text-emerald-50 font-medium">নিচের পণ্য গ্যালারি থেকে পছন্দের পণ্য বেছে নিয়ে খুব সহজে অর্ডার করুন। দ্রুততম সময়ে আপনার ঠিকানায় ডেলিভারি পৌঁছে যাবে!</p>
          
          <div className="flex flex-wrap gap-2.5 pt-2" id="customer-view-toggle">
            <button
              onClick={() => setActiveCustomerView('shop')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeCustomerView === 'shop'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'bg-emerald-700/50 hover:bg-emerald-700 text-white'
              }`}
            >
              🛍️ পণ্য গ্যালারি
            </button>
            <button
              onClick={() => setActiveCustomerView('tracking')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeCustomerView === 'tracking'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'bg-emerald-700/50 hover:bg-emerald-700 text-white'
              }`}
            >
              📍 আমার অর্ডার ট্র্যাক করুন
              {orders.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {orders.length}
                </span>
              )}
            </button>
            
            {/* Get App Option */}
            <a
              href="https://drive.google.com/file/d/1-jaXhada0woci3GpMfVbbKtJW7dKh13w/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 bg-white/15 hover:bg-white/25 text-white flex items-center gap-1.5 border border-white/10 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-2xs"
              id="go-to-app-banner-link"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
              Get App
            </a>
          </div>
        </div>
      </div>

      {/* SHOP VIEW */}
      {activeCustomerView === 'shop' && (
        <div className="space-y-6" id="shop-view-wrapper">
          {/* Search and category filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs" id="shop-filters-row">
            <div className="relative w-full md:max-w-xs" id="shop-search-wrapper">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="পণ্যের নাম লিখে সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none" id="shop-category-scroll">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs font-bold text-gray-400 shrink-0 mr-1">বিভাগ:</span>
              {customerCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {cat === 'all' ? 'সব বিভাগ' : cat}
                </button>
              ))}

              {/* Button to add new custom category */}
              <button
                type="button"
                id="btn-open-add-category-modal"
                onClick={() => setShowAddCatModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs hover:scale-105"
                title="নতুন ক্যাটাগরি যুক্ত করুন"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ ক্যাটাগরি যোগ করুন</span>
              </button>
            </div>
          </div>

          {/* Success toast message when category added */}
          {catAddSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{catAddSuccessMsg}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">নতুন বিভাগ সক্রিয়</span>
            </motion.div>
          )}

          {/* Callout when 'অন্যান্য' category is active */}
          {activeCategory === 'অন্যান্য' && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl border border-indigo-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md" id="other-category-banner">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/40 rounded-xl border border-indigo-500/40 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">‘অন্যান্য’ ক্যাটাগরির পণ্য</h4>
                  <p className="text-[10px] text-slate-300">অন্যান্য ক্যাটাগরি ছাড়াও আপনি পছন্দের নতুন ক্যাটাগরি যুক্ত করতে পারেন।</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                নতুন ক্যাটাগরি যোগ করুন
              </button>
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="product-grid-wrapper">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                দুঃখিত, কোনো প্রোডাক্ট পাওয়া যায়নি!
              </div>
            ) : (
              filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                
                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all duration-200"
                    id={`customer-prod-card-${product.id}`}
                  >
                    {/* Visual Card Accent */}
                    <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    
                    <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {product.category}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isOutOfStock 
                              ? 'bg-rose-50 text-rose-500' 
                              : product.stock <= 10 
                                ? 'bg-amber-50 text-amber-500' 
                                : 'bg-gray-50 text-gray-500'
                          }`}>
                            {isOutOfStock ? 'স্টক শেষ' : `স্টক: ${product.stock} ${product.unit === 'kg' ? 'কেজি' : 'পিস'}`}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-gray-800 text-base line-clamp-2">{product.name}</h4>
                      </div>

                      <div className="flex items-end justify-between pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold">বিক্রয় মূল্য</p>
                          <p className="text-xl font-black text-gray-900 mt-0.5">
                            ৳ {product.sellingPrice}
                            <span className="text-xs font-semibold text-gray-400"> / {product.unit === 'kg' ? 'কেজি' : 'পিস'}</span>
                          </p>
                        </div>

                        <button
                          id={`btn-order-${product.id}`}
                          disabled={isOutOfStock}
                          onClick={() => handleOpenOrderModal(product)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-xs cursor-pointer ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.03]'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          অর্ডার করুন
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TRACKING VIEW */}
      {activeCustomerView === 'tracking' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6" id="tracking-view-wrapper">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                অর্ডার ট্র্যাকিং এবং ইতিহাস
              </h3>
              <p className="text-xs text-gray-400 mt-1">আপনার প্লেস করা সকল অর্ডার এবং লাইভ ডেলিভারি স্টেটাস দেখতে পারবেন।</p>
            </div>
            {currentUser && (
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-100 shrink-0">
                👤 আপনার অ্যাকাউন্ট: {currentUser.email}
              </div>
            )}
          </div>

          {/* Secure Search Options if not logged in */}
          {!currentUser && (
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl max-w-md space-y-2.5" id="phone-search-container">
              <label className="block text-xs font-bold text-slate-700">১. অর্ডার ট্র্যাক করতে মোবাইল নাম্বার দিন:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="যেমন: 017xxxxxxxx"
                    value={trackingPhoneQuery}
                    onChange={(e) => setTrackingPhoneQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                {trackingPhoneQuery && (
                  <button
                    onClick={() => setTrackingPhoneQuery('')}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                  >
                    মুছুন
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                ২. অথবা আপনার পূর্বের সকল অর্ডার স্বয়ংক্রিয়ভাবে সংরক্ষণ করতে <button type="button" onClick={onOpenAuth} className="text-indigo-600 hover:underline font-extrabold cursor-pointer">লগইন বা সাইন আপ</button> করুন।
              </p>
            </div>
          )}

          <div className="space-y-4" id="tracking-list">
            {(() => {
              // Calculate filtered orders
              const trackedOrders = orders.filter(order => {
                if (currentUser) {
                  return order.customerEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim();
                } else {
                  if (!trackingPhoneQuery.trim()) return false;
                  return order.customerPhone.trim() === trackingPhoneQuery.trim();
                }
              }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              if (currentUser && trackedOrders.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400 text-xs font-semibold">
                    আপনার অ্যাকাউন্ট ({currentUser.email}) থেকে এখনও কোনো অর্ডার করা হয়নি!
                  </div>
                );
              }

              if (!currentUser && !trackingPhoneQuery.trim()) {
                return (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold leading-relaxed">
                    অর্ডার দেখতে উপরে আপনার মোবাইল নাম্বার প্রদান করুন অথবা <button type="button" onClick={onOpenAuth} className="text-indigo-600 hover:underline font-extrabold cursor-pointer">লগইন করুন</button>।
                  </div>
                );
              }

              if (!currentUser && trackingPhoneQuery.trim() && trackedOrders.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400 text-xs font-semibold">
                    দুঃখিত, "{trackingPhoneQuery}" মোবাইল নাম্বার দিয়ে কোনো অর্ডার খুঁজে পাওয়া যায়নি! সঠিক নাম্বার দিয়ে পুনরায় চেষ্টা করুন।
                  </div>
                );
              }

              return trackedOrders.map(order => (
                <div 
                  key={order.id} 
                  className="border border-gray-100 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-emerald-100 transition-colors duration-150"
                  id={`tracking-card-${order.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">ID: {order.id}</span>
                      <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('bn-BD')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <p className="text-gray-600"><span className="font-semibold text-gray-800">অর্ডার পণ্য:</span> {order.productName}</p>
                      <p className="text-gray-600"><span className="font-semibold text-gray-800">পরিমান:</span> {order.quantity} টি/কেজি</p>
                      <p className="text-gray-600"><span className="font-semibold text-gray-800">মোট মূল্য:</span> ৳ {order.totalPrice}</p>
                      <p className="text-gray-600"><span className="font-semibold text-gray-800">পেমেন্ট পদ্ধতি:</span> {order.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : 'অনলাইন পেমেন্ট'}</p>
                    </div>
                  </div>

                  {/* Delivery Status Progress indicators */}
                  <div className="flex items-center gap-4 border-t border-gray-50 pt-3 md:border-t-0 md:pt-0">
                    <div className="text-left md:text-right shrink-0">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ডেলিভারি স্ট্যাটাস</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          order.status === 'pending' 
                            ? 'bg-amber-400 animate-ping' 
                            : order.status === 'delivered' 
                              ? 'bg-emerald-500' 
                              : 'bg-rose-400'
                        }`} />
                        <span className={`text-xs font-bold ${
                          order.status === 'pending' 
                            ? 'text-amber-600' 
                            : order.status === 'delivered' 
                              ? 'text-emerald-600' 
                              : 'text-rose-600'
                        }`}>
                          {order.status === 'pending' && 'পেন্ডিং (এডমিন দেখছে)'}
                          {order.status === 'delivered' && 'ডেলিভারি সম্পন্ন 🎉'}
                          {order.status === 'cancelled' && 'অর্ডার বাতিল করা হয়েছে'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL / DIALOG */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="order-modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-50 flex flex-col max-h-[92vh]"
              id="order-modal-content"
            >
              {/* Modal header */}
              <div className="bg-emerald-600 text-white p-5 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-lg">🛍️ নিরাপদ অর্ডার নিশ্চিত করুন</h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">সব বিবরণ পূরণ করে অর্ডার সম্পন্ন করুন।</p>
                </div>
                <button
                  id="btn-close-modal"
                  onClick={() => setSelectedProduct(null)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-150 cursor-pointer"
                >
                  <XIcon />
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* Product Summary */}
                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100" id="modal-product-summary">
                  <div>
                    <h4 className="font-extrabold text-gray-800 text-sm">{selectedProduct.name}</h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md inline-block mt-1 font-bold">
                      {selectedProduct.category}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-semibold">মূল্য</span>
                    <span className="font-extrabold text-sm text-gray-900">৳ {selectedProduct.sellingPrice}</span>
                  </div>
                </div>

                {/* Quantity select */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 gap-3" id="modal-quantity-row">
                  <div>
                    <p className="text-xs font-bold text-gray-700">অর্ডার করার পরিমান উল্লেখ করুন</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">সর্বোচ্চ স্টক: {selectedProduct.stock} {selectedProduct.unit === 'kg' ? 'কেজি' : 'পিস'}</p>
                  </div>

                  {selectedProduct.unit === 'kg' ? (
                    <div className="flex flex-col gap-2 shrink-0 items-end w-full sm:w-auto" id="kg-quantity-selector">
                      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0.05, Math.round((orderQuantity - 0.25) * 100) / 100);
                            setOrderQuantity(val);
                          }}
                          disabled={orderQuantity <= 0.05}
                          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            max={selectedProduct.stock}
                            value={orderQuantity === 0 ? '' : orderQuantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setOrderQuantity(val);
                              } else {
                                setOrderQuantity(0);
                              }
                            }}
                            className="w-16 text-center font-extrabold text-sm text-gray-950 bg-white border border-gray-200 rounded-md py-1 focus:outline-none focus:border-emerald-500 font-sans"
                          />
                          <span className="text-xs font-bold text-gray-700">কেজি</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.min(selectedProduct.stock, Math.round((orderQuantity + 0.25) * 100) / 100);
                            setOrderQuantity(val);
                          }}
                          disabled={orderQuantity >= selectedProduct.stock}
                          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setOrderQuantity(0.25)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            orderQuantity === 0.25 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ২৫০ গ্রাম (0.25)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderQuantity(0.5)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            orderQuantity === 0.5 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ৫০০ গ্রাম (0.5)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderQuantity(1)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            orderQuantity === 1 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ১ কেজি (1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderQuantity(1.5)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            orderQuantity === 1.5 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ১.৫ কেজি (1.5)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderQuantity(2)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            orderQuantity === 2 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ২ কেজি (2)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl" id="piece-quantity-selector">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(-1)}
                        disabled={orderQuantity <= 1}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-16 text-center font-extrabold text-sm text-gray-900">
                        {orderQuantity} পিস
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(1)}
                        disabled={orderQuantity >= selectedProduct.stock}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Details Form */}
                <div className="space-y-3.5" id="modal-customer-inputs">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ডেলিভারি বিবরণী পূরণ করুন</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div id="cust-input-name">
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">আপনার নাম <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="আপনার নাম লিখুন"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div id="cust-input-phone">
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">মোবাইল নাম্বার <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="017xxxxxxxx"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div id="cust-input-address">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">ডেলিভারি ঠিকানা <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        required
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder="রোড নং, হাউজ নং, এলাকা, থানা, জেলা উল্লেখ করুন"
                        rows={2}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div id="cust-input-payment">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5">পেমেন্ট মেথড সিলেক্ট করুন</label>
                    <div className="grid grid-cols-2 gap-3" id="payment-methods-grid">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-150 cursor-pointer ${
                          paymentMethod === 'cod'
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 font-bold'
                            : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <Truck className={`w-5 h-5 mb-1 ${paymentMethod === 'cod' ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <span className="text-[11px] font-bold">ক্যাশ অন ডেলিভারি</span>
                        <span className="text-[9px] text-gray-400 mt-0.5">হাতে পেয়ে টাকা দিন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-150 cursor-pointer ${
                          paymentMethod === 'online'
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 font-bold'
                            : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <CreditCard className={`w-5 h-5 mb-1 ${paymentMethod === 'online' ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <span className="text-[11px] font-bold">অনলাইন পেমেন্ট</span>
                        <span className="text-[9px] text-gray-400 mt-0.5">বিকাশ, নগদ, রকেট সেন্ড মানি</span>
                      </button>
                    </div>

                    {/* Online Payment Details Card */}
                    {paymentMethod === 'online' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3.5 bg-gradient-to-br from-slate-50 via-indigo-50/50 to-emerald-50/30 p-4 rounded-2xl border border-indigo-200/80 space-y-3"
                        id="online-payment-details-card"
                      >
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-600" />
                            সেন্ড মানি পেমেন্ট নির্দেশিকা
                          </span>
                          <span className="text-[9px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                            Personal Number
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-700 font-medium">
                          ১. নিচের যেকোনো নম্বরে <b className="text-emerald-700">৳ {currentTotalPrice} Tk</b> সেন্ড মানি (Send Money) করুন:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* bKash */}
                          <div className="bg-white p-2.5 rounded-xl border border-pink-200 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-pink-600">বিকাশ (bKash)</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-mono font-bold text-xs text-slate-900">01756447869</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard('01756447869')}
                                className="text-[9px] bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {copiedNum === '01756447869' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                {copiedNum === '01756447869' ? 'কপি হয়েছে' : 'কপি'}
                              </button>
                            </div>
                          </div>

                          {/* Nagad */}
                          <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-amber-600">নগদ (Nagad)</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-mono font-bold text-xs text-slate-900">01756447869</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard('01756447869')}
                                className="text-[9px] bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {copiedNum === '01756447869' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                {copiedNum === '01756447869' ? 'কপি হয়েছে' : 'কপি'}
                              </button>
                            </div>
                          </div>

                          {/* Rocket */}
                          <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-purple-600">রকেট (Rocket)</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-mono font-bold text-xs text-slate-900">01756447869</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard('01756447869')}
                                className="text-[9px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {copiedNum === '01756447869' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                {copiedNum === '01756447869' ? 'কপি হয়েছে' : 'কপি'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-700 font-medium pt-1">
                          ২. টাকা সেন্ড মানি করে নিচের দুটি ঘর পূরণ করুন:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              টাকা পাঠানো মোবাইল নম্বর <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={paymentPhone}
                              onChange={(e) => setPaymentPhone(e.target.value)}
                              placeholder="যেমন: 01712345678"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              ট্রানজেকশন আইডি (TrxID) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={paymentTrxId}
                              onChange={(e) => setPaymentTrxId(e.target.value)}
                              placeholder="যেমন: 9J7X2K4M1N"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono font-bold uppercase"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {checkoutError && (
                  <p className="text-rose-500 text-xs font-bold" id="checkout-error-msg">{checkoutError}</p>
                )}

                {/* Subtotal & Confirm buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4" id="checkout-footer">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block">মোট বিল</span>
                    <span className="text-2xl font-black text-gray-950">৳ {currentTotalPrice}</span>
                  </div>

                  <button
                    type="submit"
                    id="btn-confirm-checkout"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all duration-200 shadow-md cursor-pointer"
                  >
                    অর্ডার নিশ্চিত করুন
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PLACED ORDER SUCCESS MODAL */}
      <AnimatePresence>
        {lastPlacedOrderId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="success-modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 text-center space-y-6 shadow-2xl border border-gray-50 max-h-[92vh] overflow-y-auto"
              id="success-modal-content"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto" id="success-icon-container">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">🎉 অর্ডার সফলভাবে প্লেস হয়েছে!</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  আপনার অর্ডারটির জন্য আপনাকে অসংখ্য ধন্যবাদ। আমাদের একজন প্রতিনিধি খুব শীঘ্রই আপনার মোবাইলে কল করে অর্ডারটি নিশ্চিত করবেন।
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5 text-xs text-left" id="success-modal-summary">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">অর্ডার আইডি:</span>
                  <span className="font-extrabold text-emerald-700">{lastPlacedOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">পেমেন্ট পদ্ধতি:</span>
                  <span className="font-extrabold text-gray-700">{paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'অনলাইন পেমেন্ট'}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200/60 pt-1.5 mt-1.5">
                  <span className="text-gray-600 font-extrabold">মোট বিল পরিশোধযোগ্য:</span>
                  <span className="font-black text-sm text-gray-950">৳ {currentTotalPrice} Tk</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2" id="success-modal-buttons">
                <button
                  id="btn-success-track"
                  onClick={handleViewOrderTracking}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  অর্ডার ট্র্যাক করুন
                </button>
                <div className="flex gap-2.5">
                  <button
                    id="btn-success-close"
                    onClick={() => {
                      setLastPlacedOrderId(null);
                      setActiveCustomerView('shop');
                    }}
                    className="flex-1 py-3 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-[11px] sm:text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 border border-gray-200"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                    বাজার চালিয়ে যান
                  </button>
                  <button
                    id="btn-success-home"
                    onClick={() => {
                      setLastPlacedOrderId(null);
                      setActiveCustomerView('shop');
                    }}
                    className="flex-1 py-3 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-[11px] sm:text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-100"
                  >
                    <Home className="w-3.5 h-3.5 text-indigo-500" />
                    ড্যাশবোর্ডে যান
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddCatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" id="add-category-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4"
              id="add-category-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">নতুন ক্যাটাগরি যুক্ত করুন 🏷️</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">আপনার পছন্দের নতুন পণ্যের বিভাগ যোগ করুন</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddCatModal(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ক্যাটাগরির নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder="যেমন: মসলাপাতি, ফলমূল, স্ন্যাকস, বেকারি ইত্যাদি"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-600 font-bold placeholder-slate-400 shadow-2xs"
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 font-medium">
                  ✨ <b>সুবিধা:</b> নতুন ক্যাটাগরি সেভ করার সাথে সাথে এটি রিয়েল-টাইমে সেভ হয়ে ফিল্টার অপশনে চলে আসবে এবং পণ্য যোগ করার জন্য উন্মুক্ত হবে।
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCatModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={!newCatInput.trim() || addingCatLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {addingCatLoading ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি সেভ করুন'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Customer Chat Box */}
      <AiChatWidget products={products} />
    </div>
  );
}

// Custom Close icon SVG because it's clean
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
