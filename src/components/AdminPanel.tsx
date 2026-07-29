import React, { useState } from 'react';
import { 
  Plus, Search, Trash2, TrendingUp, DollarSign, Package, 
  ShoppingCart, Check, X, Layers, Users, TrendingDown, RefreshCw, PlusCircle,
  LayoutGrid, List, Bell, BellRing, Copy, Volume2, VolumeX, Edit2, Calendar, CalendarCheck,
  Bot, Send, Sparkles, CheckCircle2
} from 'lucide-react';
import { Product, Order, UnitType, SubAdmin, Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  subAdmins: SubAdmin[];
  isMainAdmin: boolean;
  onAddProduct: (product: Omit<Product, 'id' | 'stock' | 'totalAddedQuantity'> & { initialStock: number }) => void;
  onAddStock: (productId: string, quantity: number) => void;
  onDeleteProduct: (productId: string) => void;
  onEditProduct: (productId: string, updatedFields: Partial<Product>) => void;
  onUpdateOrderStatus: (orderId: string, status: 'delivered' | 'cancelled') => void;
  onResetData: () => void;
  onAddSubAdmin: (email: string) => Promise<void>;
  onRemoveSubAdmin: (email: string) => Promise<void>;
  fcmToken: string;
  notificationPermission: string;
  onRegisterPush: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  expenses?: Expense[];
  onAddExpense?: (title: string, amount: number) => void;
  onDeleteExpense?: (expenseId: string) => void;
  categories: string[];
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
}

export default function AdminPanel({
  products,
  orders,
  subAdmins,
  isMainAdmin,
  onAddProduct,
  onAddStock,
  onDeleteProduct,
  onEditProduct,
  onUpdateOrderStatus,
  onResetData,
  onAddSubAdmin,
  onRemoveSubAdmin,
  fcmToken,
  notificationPermission,
  onRegisterPush,
  soundEnabled,
  onToggleSound,
  expenses = [],
  onAddExpense = () => {},
  onDeleteExpense = () => {},
  categories,
  onAddCategory,
  onDeleteCategory
}: AdminPanelProps) {
  // Tabs within Admin Panel
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'products' | 'orders' | 'subadmins' | 'notifications'>('dashboard');

  
  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [viewStyle, setViewStyle] = useState<'table' | 'gallery'>('gallery');

  // New Product Form States
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('মিষ্টি জাতীয়');
  const [newProdUnit, setNewProdUnit] = useState<UnitType>('kg');
  const [newProdCostPrice, setNewProdCostPrice] = useState('');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [formError, setFormError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Product Edit Form States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdUnit, setEditProdUnit] = useState<UnitType>('kg');
  const [editProdCostPrice, setEditProdCostPrice] = useState('');
  const [editProdSellingPrice, setEditProdSellingPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');
  const [editProdTotalAddedQty, setEditProdTotalAddedQty] = useState('');
  const [editFormError, setEditFormError] = useState('');

  const startEditingProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProdName(product.name);
    setEditProdCategory(product.category);
    setEditProdUnit(product.unit);
    setEditProdCostPrice(product.costPrice.toString());
    setEditProdSellingPrice(product.sellingPrice.toString());
    setEditProdStock(product.stock.toString());
    setEditProdTotalAddedQty(product.totalAddedQuantity.toString());
    setEditFormError('');
  };

  // Add Stock Modal/Inline State
  const [addingStockProductId, setAddingStockProductId] = useState<string | null>(null);
  const [stockToAdd, setStockToAdd] = useState('');

  // Expense Form States
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // Iframe-safe Custom confirmation states (replacing window.confirm)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [removingSubAdminEmail, setRemovingSubAdminEmail] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);

  // AI & Telegram Automation States
  const [aiTestPrompt, setAiTestPrompt] = useState('');
  const [aiTestResponse, setAiTestResponse] = useState('');
  const [aiTestLoading, setAiTestLoading] = useState(false);

  // Category manager states
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Keep selected new product category in sync with available categories
  React.useEffect(() => {
    if (categories && categories.length > 0 && !categories.includes(newProdCategory)) {
      setNewProdCategory(categories[0]);
    }
  }, [categories, newProdCategory]);

  // Financial Calculations
  // Total Product Invest = sum of (totalAddedQuantity * costPrice) for all products
  const totalProductInvestment = products.reduce((sum, p) => sum + (p.totalAddedQuantity * p.costPrice), 0);
  
  // Total Other Expenses
  const totalOtherExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Total Invest = Product investment + Other expenses
  const totalInvestment = totalProductInvestment + totalOtherExpenses;
  
  // Completed Orders
  const completedOrders = orders.filter(o => o.status === 'delivered');
  
  // Total Revenue = sum of totalPrice of completed orders
  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Total Cost of Delivered Sales = sum of (order.quantity * product.costPrice)
  const totalCostOfSales = completedOrders.reduce((sum, o) => {
    const product = products.find(p => p.id === o.productId);
    const costPrice = product ? product.costPrice : 0;
    return sum + (o.quantity * costPrice);
  }, 0);

  // Total Profit = Total Sales - Cost of Delivered Sales (Gross Profit)
  const totalProfit = totalSales - totalCostOfSales;

  // Net Profit = Gross Profit - Other Expenses
  const netProfit = totalProfit - totalOtherExpenses;

  // Potential Profit of remaining stock = sum of (stock * (sellingPrice - costPrice))
  const potentialProfit = products.reduce((sum, p) => sum + (p.stock * (p.sellingPrice - p.costPrice)), 0);

  // Active/Pending Orders count
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  // 1. Daily Invest and Profit calculation helper
  // Let's group completed orders and expenses by date (YYYY-MM-DD)
  const getLocalDateString = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  const todayStr = getLocalDateString(new Date().toISOString());

  // Grouping maps
  const dailyDataMap: {
    [key: string]: {
      date: string;
      sales: number;
      costOfSales: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
      ordersCount: number;
    }
  } = {};

  // Process completed orders
  completedOrders.forEach(o => {
    const dStr = getLocalDateString(o.createdAt);
    if (!dStr) return;
    if (!dailyDataMap[dStr]) {
      dailyDataMap[dStr] = { date: dStr, sales: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netProfit: 0, ordersCount: 0 };
    }
    const product = products.find(p => p.id === o.productId);
    const costPrice = product ? product.costPrice : 0;
    const itemCost = o.quantity * costPrice;

    dailyDataMap[dStr].sales += o.totalPrice;
    dailyDataMap[dStr].costOfSales += itemCost;
    dailyDataMap[dStr].grossProfit += (o.totalPrice - itemCost);
    dailyDataMap[dStr].ordersCount += 1;
  });

  // Process expenses
  expenses.forEach(e => {
    const dStr = getLocalDateString(e.createdAt);
    if (!dStr) return;
    if (!dailyDataMap[dStr]) {
      dailyDataMap[dStr] = { date: dStr, sales: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netProfit: 0, ordersCount: 0 };
    }
    dailyDataMap[dStr].expenses += e.amount;
  });

  // Calculate net profits for all entries
  Object.keys(dailyDataMap).forEach(key => {
    dailyDataMap[key].netProfit = dailyDataMap[key].grossProfit - dailyDataMap[key].expenses;
  });

  // Sort daily records descending by date
  const sortedDailyRecords = Object.values(dailyDataMap).sort((a, b) => b.date.localeCompare(a.date));

  // Today's specific metrics
  const todayMetrics = dailyDataMap[todayStr] || {
    date: todayStr,
    sales: 0,
    costOfSales: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    ordersCount: 0
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setFormError('পণ্যের নাম আবশ্যক!');
      return;
    }
    const cost = parseFloat(newProdCostPrice);
    const sell = parseFloat(newProdSellingPrice);
    const initialStock = parseFloat(newProdStock);

    if (isNaN(cost) || cost <= 0) {
      setFormError('সঠিক ক্রয় মূল্য দিন!');
      return;
    }
    if (isNaN(sell) || sell <= 0) {
      setFormError('সঠিক বিক্রয় মূল্য দিন!');
      return;
    }
    if (sell < cost) {
      setFormError('বিক্রয় মূল্য অবশ্যই ক্রয় মূল্যের চেয়ে বেশি বা সমান হতে হবে!');
      return;
    }
    if (isNaN(initialStock) || initialStock < 0) {
      setFormError('সঠিক পরিমান দিন!');
      return;
    }

    onAddProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      unit: newProdUnit,
      costPrice: cost,
      sellingPrice: sell,
      initialStock: initialStock
    });

    // Automatically switch filter to show newly added product
    setSelectedCategory('all');

    // Reset Form
    setNewProdName('');
    setNewProdCostPrice('');
    setNewProdSellingPrice('');
    setNewProdStock('');
    setFormError('');
    setShowAddForm(false);
  };

  const handleAddStockSubmit = (productId: string) => {
    const qty = parseFloat(stockToAdd);
    if (isNaN(qty) || qty <= 0) {
      alert('সঠিক পরিমান লিখুন!');
      return;
    }
    onAddStock(productId, qty);
    setAddingStockProductId(null);
    setStockToAdd('');
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editProdName.trim()) {
      setEditFormError('পণ্যের নাম আবশ্যক!');
      return;
    }
    const cost = parseFloat(editProdCostPrice);
    const sell = parseFloat(editProdSellingPrice);
    const stock = parseFloat(editProdStock);
    const totalAdded = parseFloat(editProdTotalAddedQty);

    if (isNaN(cost) || cost <= 0) {
      setEditFormError('সঠিক ক্রয় মূল্য দিন!');
      return;
    }
    if (isNaN(sell) || sell <= 0) {
      setEditFormError('সঠিক বিক্রয় মূল্য দিন!');
      return;
    }
    if (sell < cost) {
      setEditFormError('বিক্রয় মূল্য অবশ্যই ক্রয় মূল্যের চেয়ে বেশি বা সমান হতে হবে!');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setEditFormError('সঠিক স্টকের পরিমান দিন!');
      return;
    }
    if (isNaN(totalAdded) || totalAdded < 0) {
      setEditFormError('সঠিক মোট যুক্ত স্টকের পরিমান দিন!');
      return;
    }

    onEditProduct(editingProduct.id, {
      name: editProdName.trim(),
      category: editProdCategory,
      unit: editProdUnit,
      costPrice: cost,
      sellingPrice: sell,
      stock: stock,
      totalAddedQuantity: totalAdded
    });

    // Reset editing state
    setEditingProduct(null);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim()) {
      setExpenseError('খরচের বিবরণ দিন!');
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setExpenseError('সঠিক টাকার পরিমাণ দিন!');
      return;
    }

    setExpenseError('');
    onAddExpense(expenseTitle.trim(), amount);
    setExpenseTitle('');
    setExpenseAmount('');
  };

  const handleTestAi = async () => {
    if (!aiTestPrompt.trim()) return;
    setAiTestLoading(true);
    setAiTestResponse('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiTestPrompt.trim() })
      });
      const data = await res.json();
      if (data.response) {
        setAiTestResponse(data.response);
      } else {
        setAiTestResponse(data.error || 'রেসপন্স পাওয়া যায়নি।');
      }
    } catch (err: any) {
      setAiTestResponse('ত্রুটি: ' + (err.message || 'নেটওয়ার্ক সমস্যা'));
    } finally {
      setAiTestLoading(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.category.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.customerPhone.includes(orderSearch) || 
                          o.productName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.id.includes(orderSearch);
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="w-full space-y-4" id="admin-panel-container">
      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-3" id="admin-sub-header">
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200" id="admin-tab-group">
          <button
            id="admin-tab-dashboard"
            onClick={() => setActiveAdminTab('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
              activeAdminTab === 'dashboard'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📊 ড্যাশবোর্ড ও লাভ-ক্ষতি
          </button>
          <button
            id="admin-tab-products"
            onClick={() => setActiveAdminTab('products')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
              activeAdminTab === 'products'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📦 পণ্য স্টক ও মূল্য
          </button>
          <button
            id="admin-tab-orders"
            onClick={() => setActiveAdminTab('orders')}
            className={`relative px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
              activeAdminTab === 'orders'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🛒 কাস্টমার অর্ডার সমূহ
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>
          {isMainAdmin && (
            <button
              id="admin-tab-subadmins"
              onClick={() => setActiveAdminTab('subadmins')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
                activeAdminTab === 'subadmins'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              👥 সাব-অ্যাডমিন প্যানেল
            </button>
          )}
          <button
            id="admin-tab-notifications"
            onClick={() => setActiveAdminTab('notifications')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
              activeAdminTab === 'notifications'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🔔 নোটিফিকেশন ও পুশ
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeAdminTab === 'dashboard' && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
          id="dashboard-tab-content"
        >
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" id="metrics-grid">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3" id="metric-invest">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">মোট ইনভেস্ট (বিনিয়োগ)</p>
                <p className="text-base font-black text-slate-900 mt-0.5 truncate">৳ {totalInvestment.toLocaleString('bn-BD')}</p>
                <p className="text-[9px] text-slate-400 font-medium truncate" title={`পণ্য: ৳${totalProductInvestment.toLocaleString('bn-BD')} | খরচ: ৳${totalOtherExpenses.toLocaleString('bn-BD')}`}>
                  পণ্য: ৳{totalProductInvestment.toLocaleString('bn-BD')} <br/> খরচ: ৳{totalOtherExpenses.toLocaleString('bn-BD')}
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3" id="metric-sales">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">মোট বিক্রয় (রেভিনিউ)</p>
                <p className="text-base font-black text-emerald-600 mt-0.5 truncate">৳ {totalSales.toLocaleString('bn-BD')}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-1 truncate">ডেলিভারি হওয়া মোট মূল্য</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3" id="metric-gross-profit">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">গ্রস প্রফিট (মোট লাভ)</p>
                <p className="text-base font-black text-indigo-600 mt-0.5 truncate">৳ {totalProfit.toLocaleString('bn-BD')}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-1 truncate">ডেলিভারি পণ্যের লাভ</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-3.5 rounded-xl shadow-sm flex items-center gap-3 text-white" id="metric-net-profit">
              <div className="p-2.5 bg-white/15 text-white rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">নিট প্রফিট (আসল লাভ)</p>
                <p className="text-lg font-black text-white mt-0.5 truncate">৳ {netProfit.toLocaleString('bn-BD')}</p>
                <p className="text-[9px] text-indigo-200 font-bold mt-1 truncate">গ্রস লাভ - অন্যান্য খরচ</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3" id="metric-pending">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">পেন্ডিং ও সম্ভাব্য লাভ</p>
                <p className="text-base font-black text-slate-900 mt-0.5 truncate">{pendingOrdersCount} টি অর্ডার</p>
                <p className="text-[9px] text-amber-600 font-bold mt-1 truncate" title={`৳ ${potentialProfit.toLocaleString('bn-BD')}`}>সম্ভাব্য: ৳ {potentialProfit.toLocaleString('bn-BD')}</p>
              </div>
            </div>
          </div>

          {/* Today's live dashboard & daily statements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 animate-fade-in" id="today-daily-section">
            {/* Today's live cards (2/3 col on desktop) */}
            <div className="lg:col-span-2 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5" id="today-live-card">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-indigo-600 animate-pulse" />
                  আজকের লাইভ হিসাব ({new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })})
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2.5 py-0.5 rounded-lg">লাইভ আপডেট</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আজকের বিক্রয়</p>
                    <p className="text-base font-black text-emerald-600 mt-0.5">৳ {todayMetrics.sales.toLocaleString('bn-BD')}</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{todayMetrics.ordersCount} টি সফল অর্ডার</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-500 rounded-lg shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আজকের ইনভেস্ট (খরচ)</p>
                    <p className="text-base font-black text-rose-600 mt-0.5">৳ {todayMetrics.expenses.toLocaleString('bn-BD')}</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">আজকের আদার্স খরচ</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আজকের নিট প্রফিট</p>
                    <p className={`text-base font-black mt-0.5 ${todayMetrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      ৳ {todayMetrics.netProfit.toLocaleString('bn-BD')}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">গ্রস লাভ - খরচ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Daily ledger (1/3 col on desktop) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between" id="daily-ledger-card">
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    দৈনিক লাভ-ক্ষতি বিবরণী
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold">বিগত দিনসমূহ</span>
                </div>

                <div className="overflow-y-auto max-h-[110px] pr-1 space-y-1.5" id="daily-records-list">
                  {sortedDailyRecords.length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-slate-400 font-semibold italic">
                      দৈনিক কোনো রেকর্ড এখনও নেই।
                    </div>
                  ) : (
                    sortedDailyRecords.map((record) => {
                      const isToday = record.date === todayStr;
                      return (
                        <div 
                          key={record.date} 
                          className={`p-2 rounded-xl border text-[11px] flex justify-between items-center transition-all ${
                            isToday 
                              ? 'bg-indigo-50/50 border-indigo-150 shadow-2xs font-bold' 
                              : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-slate-800 font-bold">
                              {isToday ? 'আজকে' : new Date(record.date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium ml-1.5">({record.ordersCount} অর্ডার)</span>
                          </div>
                          <div className="flex gap-3 text-right">
                            <div>
                              <span className="text-[8px] text-slate-400 block font-medium">ইনভেস্ট (খরচ)</span>
                              <span className="font-extrabold text-rose-600">৳ {record.expenses}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-400 block font-medium">নিট প্রফিট</span>
                              <span className={`font-black ${record.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>৳ {record.netProfit}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Graphical/Insight Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5" id="dashboard-insights-row">
            {/* Sales breakdown & calculations */}
            <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-4" id="calc-explanation-card">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                ব্যবসায়িক লাভ-ক্ষতি হিসাব ও নীতি
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3" id="formula-grid">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">১. ইনভেস্ট হিসাব</p>
                  <p className="text-xs font-bold text-slate-800">৳ {totalInvestment.toLocaleString('bn-BD')}</p>
                  <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">যুক্ত করা সকল পণ্য ও অন্যান্য খরচের মোট পরিমাণ।</span>
                </div>
                <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-100">
                  <p className="text-[11px] font-semibold text-emerald-800 mb-1">২. সফল বিক্রয়</p>
                  <p className="text-xs font-bold text-emerald-700">৳ {totalSales.toLocaleString('bn-BD')}</p>
                  <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">ডেলিভারি সম্পন্ন হওয়া অর্ডারের মোট বিক্রয়মূল্য।</span>
                </div>
                <div className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100">
                  <p className="text-[11px] font-semibold text-indigo-800 mb-1">৩. গ্রস প্রফিট (লাভ)</p>
                  <p className="text-xs font-bold text-indigo-700">৳ {totalProfit.toLocaleString('bn-BD')}</p>
                  <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">ডেলিভারি করা পণ্য সমূহের (বিক্রয় - ক্রয়) মোট লাভ।</span>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                  <p className="text-[11px] font-semibold text-violet-800 mb-1">৪. অর্জিত নিট প্রফিট</p>
                  <p className="text-xs font-bold text-violet-700">৳ {netProfit.toLocaleString('bn-BD')}</p>
                  <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">মোট গ্রস লাভ থেকে অন্যান্য ব্যবসার খরচ বিয়োগ করা লাভ।</span>
                </div>
              </div>

              {/* Progress toward investment recovery */}
              <div className="space-y-1.5 pt-1" id="investment-progress">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>ইনভেস্টমেন্ট রিকভারি অগ্রগতি (বিক্রয় বনাম মোট ইনভেস্ট)</span>
                  <span>{totalInvestment > 0 ? Math.round((totalSales / totalInvestment) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, totalInvestment > 0 ? (totalSales / totalInvestment) * 100 : 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {totalSales >= totalInvestment 
                    ? '🎉 অভিনন্দন! আপনি আপনার মূল ইনভেস্টমেন্ট পুরোপুরি তুলে নিয়েছেন এবং এখন সম্পূর্ণ লাভে আছেন!'
                    : `মূল ইনভেস্টমেন্ট তুলতে আরো ৳ ${(totalInvestment - totalSales).toLocaleString('bn-BD')} বিক্রয় প্রয়োজন।`
                  }
                </p>
              </div>
            </div>

            {/* Quick Stats list */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3" id="recent-insight-card">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                দোকানের অবস্থা এক নজরে
              </h3>
              <div className="divide-y divide-slate-100 text-[11px]" id="shop-summary-list">
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">মোট ভিন্ন প্রোডাক্ট সংখ্যা:</span>
                  <span className="font-bold text-slate-800">{products.length} টি</span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">মোট স্টক প্রোডাক্ট পরিমান:</span>
                  <span className="font-bold text-slate-800">
                    {products.reduce((sum, p) => sum + p.stock, 0).toLocaleString('bn-BD')} টি/কেজি
                  </span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">মোট প্রাপ্ত অর্ডার সংখ্যা:</span>
                  <span className="font-bold text-slate-800">{orders.length} টি</span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">সফল ডেলিভারি সম্পন্ন:</span>
                  <span className="font-bold text-emerald-600">{completedOrders.length} টি</span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">বাতিল হওয়া অর্ডার:</span>
                  <span className="font-bold text-rose-500">{orders.filter(o => o.status === 'cancelled').length} টি</span>
                </div>
              </div>
            </div>
          </div>

          {/* New Section: Manage Other Expenses (ইনভেস্ট ও আদার্স খরচ পরিচালনা) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="manage-expenses-section">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-rose-500" />
                  ইনভেস্ট ও আদার্স খরচ পরিচালনা (Manage Other Business Expenses)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ব্যবসার অন্যান্য বিনিয়োগ সংক্রান্ত খরচসমূহ (যেমন প্যাকেজিং, পরিবহন, বিদ্যুৎ বিল ইত্যাদি) এখানে যুক্ত করুন যাতে নিট প্রফিট হিসাব সহজ হয়।
                </p>
              </div>
              <div className="bg-rose-50 px-3 py-1 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-100 flex items-center gap-1">
                <span>মোট আদার্স খরচ:</span>
                <span className="text-sm">৳ {totalOtherExpenses.toLocaleString('bn-BD')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="expenses-internal-grid">
              {/* Form Column */}
              <div className="lg:col-span-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  নতুন খরচ যুক্ত করুন
                </h4>

                <form onSubmit={handleAddExpenseSubmit} className="space-y-3" id="add-expense-form">
                  {expenseError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-lg flex items-center gap-1.5" id="expense-error">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                      {expenseError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">খরচের বিবরণ / নাম <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: প্যাকেজিং কার্টন, ডেলিভারি চার্জ ইত্যাদি"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 font-medium placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">টাকার পরিমাণ (৳) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="টাকার পরিমাণ লিখুন"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 font-bold text-rose-600 placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    খরচ যুক্ত করুন
                  </button>
                </form>
              </div>

              {/* List Table Column */}
              <div className="lg:col-span-8 flex flex-col justify-between" id="expenses-list-column">
                <div className="overflow-hidden border border-slate-100 rounded-xl bg-white">
                  <div className="overflow-x-auto max-h-[220px]">
                    <table className="w-full text-left border-collapse" id="expenses-table">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <th className="px-3.5 py-2.5">খরচের বিবরণ</th>
                          <th className="px-3.5 py-2.5">টাকার পরিমাণ</th>
                          <th className="px-3.5 py-2.5">যুক্ত করার তারিখ</th>
                          <th className="px-3.5 py-2.5 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-[11px] text-slate-400 font-semibold italic">
                              কোনো আদার্স খরচ যুক্ত করা হয়নি।
                            </td>
                          </tr>
                        ) : (
                          expenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3.5 py-2.5 font-bold text-slate-900">{exp.title}</td>
                              <td className="px-3.5 py-2.5 font-bold text-rose-600">৳ {exp.amount.toLocaleString('bn-BD')}</td>
                              <td className="px-3.5 py-2.5 font-medium text-slate-400 text-[10px]">
                                {new Date(exp.createdAt).toLocaleDateString('bn-BD', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(exp.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* PRODUCTS TAB */}
      {activeAdminTab === 'products' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
          id="products-tab-content"
        >
          {/* Add Product Trigger & Form */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs" id="add-product-wrapper">
            <div className="flex flex-wrap items-center justify-between gap-2" id="add-product-toggle-bar">
              <div>
                <h3 className="text-sm font-bold text-slate-900">পণ্যের তালিকা এবং যুক্ত করার প্যানেল</h3>
                <p className="text-xs text-slate-400 mt-0.5">নতুন পণ্য যুক্ত করুন এবং স্টকের পরিমাণ ও বিক্রয়মূল্য নিয়ন্ত্রণ করুন</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-toggle-category-manager"
                  onClick={() => {
                    setShowCategoryManager(!showCategoryManager);
                    if (showAddForm) setShowAddForm(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 border ${
                    showCategoryManager 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  ক্যাটাগরি পরিচালনা
                </button>
                <button
                  type="button"
                  id="btn-toggle-add-form"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    if (showCategoryManager) setShowCategoryManager(false);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                    showAddForm 
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                      : 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                  }`}
                >
                  {showAddForm ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      ফরম বন্ধ করুন
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      নতুন পণ্য যোগ করুন
                    </>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  id="add-product-form"
                  onSubmit={handleCreateProduct}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-slate-150 grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <div className="md:col-span-2 space-y-2.5" id="form-left-col">
                    <div id="form-input-name">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">পণ্যের নাম (বাংলায় লিখুন) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="যেমন: দেশি রসুন, প্রিমিয়াম কালিজিরা চাল ইত্যাদি"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3" id="form-input-category-unit">
                      <div id="form-input-category">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">ক্যাটাগরি</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div id="form-input-unit">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">পরিমাপের একক</label>
                        <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200" id="unit-toggle-group">
                          <button
                            type="button"
                            onClick={() => setNewProdUnit('kg')}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                              newProdUnit === 'kg' 
                                ? 'bg-white text-slate-900 shadow-xs' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            কেজি (kg)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewProdUnit('piece')}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                              newProdUnit === 'piece' 
                                ? 'bg-white text-slate-900 shadow-xs' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            পিস / সংখ্যা
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5" id="form-right-col">
                    <div className="grid grid-cols-3 gap-2" id="form-input-prices-stock">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">ক্রয় মূল্য (৳) <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          value={newProdCostPrice}
                          onChange={(e) => setNewProdCostPrice(e.target.value)}
                          placeholder="৳৪০"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">বিক্রয় মূল্য (৳) <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          value={newProdSellingPrice}
                          onChange={(e) => setNewProdSellingPrice(e.target.value)}
                          placeholder="৳৫০"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">পরিমাণ <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          value={newProdStock}
                          onChange={(e) => setNewProdStock(e.target.value)}
                          placeholder="১০০"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                    </div>

                    {formError && (
                      <p className="text-rose-500 text-[11px] font-bold" id="form-error-msg">{formError}</p>
                    )}

                    <button
                      type="submit"
                      id="btn-submit-add-product"
                      className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      দোকানে পণ্যটি যুক্ত করুন
                    </button>
                  </div>
                </motion.form>
              )}

              {showCategoryManager && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-slate-150 animate-duration-150"
                  id="category-manager-container"
                >
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Add Category Form */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                        নতুন পণ্য ক্যাটাগরি যোগ করুন
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="যেমন: মসলা ও তেল, ফলমূল ইত্যাদি"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 font-bold placeholder-slate-400"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const val = newCategoryInput.trim();
                            if (!val) {
                              alert('ক্যাটাগরি নাম লিখুন!');
                              return;
                            }
                            if (categories.includes(val)) {
                              alert('এই ক্যাটাগরি ইতিমধ্যে রয়েছে!');
                              return;
                            }
                            await onAddCategory(val);
                            setNewCategoryInput('');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer transition-all shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          যুক্ত করুন
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        * নতুন ক্যাটাগরি যুক্ত করলে তা সাথে সাথে পণ্য যোগ করার প্যানেল এবং গ্রাহক প্যানেলে বিভাগ ফিল্টার তালিকায় যুক্ত হবে।
                      </p>
                    </div>

                    {/* Categories List */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        বর্তমান ক্যাটাগরিসমূহ ({categories.length} টি)
                      </h4>
                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                        {categories.map(cat => {
                          const isDefault = cat === 'অন্যান্য' || cat === 'মিষ্টি জাতীয়' || cat === 'কোমল পানীয়';
                          return (
                            <div 
                              key={cat} 
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-150 rounded-lg text-xs font-bold text-slate-700"
                            >
                              <span>{cat}</span>
                              {!isDefault && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`আপনি কি "${cat}" ক্যাটাগরি মুছে ফেলতে চান?`)) {
                                      await onDeleteCategory(cat);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Product Filter and Table Container */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden" id="product-list-card">
            {/* Filter bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3" id="product-filter-bar">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
                <div className="relative w-full sm:max-w-xs" id="product-search-wrapper">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="পণ্য খুঁজুন..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto" id="category-filter-group">
                  <span className="text-[11px] font-bold text-slate-500">ফিল্টার:</span>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                      selectedCategory === 'all'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    সব পণ্য
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                        selectedCategory === cat
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 shrink-0 w-full sm:w-auto justify-center sm:justify-start" id="view-style-toggle">
                <button
                  type="button"
                  onClick={() => setViewStyle('gallery')}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 w-1/2 sm:w-auto ${
                    viewStyle === 'gallery'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                  🖼️ গ্যালারি ভিউ
                </button>
                <button
                  type="button"
                  onClick={() => setViewStyle('table')}
                  className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 w-1/2 sm:w-auto ${
                    viewStyle === 'table'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-indigo-600" />
                  📋 তালিকা ভিউ
                </button>
              </div>
            </div>

            {/* Render conditional Gallery / Table view */}
            {viewStyle === 'gallery' ? (
              <div className="p-4 bg-slate-50/40" id="admin-product-gallery">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 font-medium">
                    কোনো পণ্য পাওয়া যায়নি!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="admin-product-gallery-grid">
                    {filteredProducts.map(prod => {
                      const profitMargin = prod.sellingPrice - prod.costPrice;
                      const productInvest = prod.totalAddedQuantity * prod.costPrice;
                      const isLowStock = prod.stock <= 10;

                      return (
                        <div
                          key={prod.id}
                          className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between space-y-4"
                          id={`admin-gallery-card-${prod.id}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                {prod.category}
                              </span>
                              {isLowStock ? (
                                <span className="bg-rose-50 text-rose-600 border border-rose-150 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">কম স্টক!</span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-150 text-[9px] px-2 py-0.5 rounded-full font-bold">স্টক ঠিক আছে</span>
                              )}
                            </div>

                            <h4 className="font-extrabold text-slate-800 text-sm mb-1">{prod.name}</h4>
                            
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">মোট স্টক:</span>
                                <span className={`font-bold ${isLowStock ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                                  {prod.stock} {prod.unit === 'kg' ? 'কেজি' : 'পিস'}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">মোট যুক্ত স্টক:</span>
                                <span className="text-slate-600 font-medium">{prod.totalAddedQuantity} {prod.unit === 'kg' ? 'কেজি' : 'পিস'}</span>
                              </div>
                              <div className="border-t border-slate-200/60 my-1"></div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">ক্রয় মূল্য:</span>
                                <span className="text-slate-700 font-semibold">৳{prod.costPrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">বিক্রয় মূল্য:</span>
                                <span className="text-indigo-600 font-extrabold">৳{prod.sellingPrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">লাভ / ইউনিট:</span>
                                <span className="text-emerald-600 font-bold">৳{profitMargin} ({Math.round((profitMargin / prod.costPrice) * 100)}%)</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 px-1">
                              <div className="flex justify-between">
                                <span>মোট ইনভেস্ট:</span>
                                <span className="font-semibold text-slate-500">৳{productInvest}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>অবশিষ্ট স্টক মূল্য:</span>
                                <span className="font-semibold text-slate-500">৳{prod.stock * prod.costPrice}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-1.5 pt-1" id={`gallery-actions-${prod.id}`}>
                              {addingStockProductId === prod.id ? (
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 w-full" id={`gallery-add-stock-${prod.id}`}>
                                  <input
                                    type="number"
                                    placeholder="পরিমাণ"
                                    value={stockToAdd}
                                    onChange={(e) => setStockToAdd(e.target.value)}
                                    className="w-full min-w-0 px-2 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none focus:border-slate-400"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleAddStockSubmit(prod.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg cursor-pointer shrink-0"
                                    title="নিশ্চিত করুন"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setAddingStockProductId(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded-lg cursor-pointer shrink-0"
                                    title="বাতিল"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : deletingProductId === prod.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200 w-full animate-pulse" id={`gallery-delete-confirm-${prod.id}`}>
                                  <span className="text-[10px] font-bold text-rose-700 mr-auto pl-1">মুছে ফেলবেন?</span>
                                  <button
                                    onClick={() => {
                                      onDeleteProduct(prod.id);
                                      setDeletingProductId(null);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer shrink-0"
                                  >
                                    হ্যাঁ
                                  </button>
                                  <button
                                    onClick={() => setDeletingProductId(null)}
                                    className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded text-[10px] cursor-pointer shrink-0"
                                  >
                                    না
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setAddingStockProductId(prod.id);
                                      setStockToAdd('');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    স্টক বাড়ান
                                  </button>
                                  <button
                                    onClick={() => startEditingProduct(prod)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-lg transition-all duration-150 cursor-pointer"
                                    title="সংশোধন করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingProductId(prod.id);
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 rounded-lg transition-all duration-150 cursor-pointer"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto" id="product-table-wrapper">
                <table className="w-full text-left border-collapse" id="product-inventory-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5">পণ্যের নাম ও ক্যাটাগরি</th>
                      <th className="px-4 py-2.5">মোট স্টক</th>
                      <th className="px-4 py-2.5">ক্রয় মূল্য</th>
                      <th className="px-4 py-2.5">বিক্রয় মূল্য</th>
                      <th className="px-4 py-2.5">সম্ভাবনা লাভ / ইউনিট</th>
                      <th className="px-4 py-2.5">মোট ইনভেস্ট</th>
                      <th className="px-4 py-2.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs" id="product-table-body">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">কোনো পণ্য পাওয়া যায়নি!</td>
                      </tr>
                    ) : (
                      filteredProducts.map(prod => {
                        const profitMargin = prod.sellingPrice - prod.costPrice;
                        const productInvest = prod.totalAddedQuantity * prod.costPrice;
                        const isLowStock = prod.stock <= 10;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-slate-800 text-xs sm:text-sm">{prod.name}</div>
                              <div className="text-[9px] text-slate-600 font-bold mt-0.5 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded inline-block">
                                {prod.category}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <span className={`font-bold text-xs sm:text-sm ${isLowStock ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                                  {prod.stock} {prod.unit === 'kg' ? 'কেজি' : 'পিস'}
                                </span>
                                {isLowStock && (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-150 text-[9px] px-1 py-0.2 rounded font-bold">কম স্টক!</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">মোট যুক্ত: {prod.totalAddedQuantity}</div>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-600 text-xs">৳{prod.costPrice}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-800 text-xs">৳{prod.sellingPrice}</td>
                            <td className="px-4 py-2.5 text-xs">
                              <span className="text-emerald-600 font-bold">৳{profitMargin}</span>
                              <span className="text-slate-400 text-[10px] block">({Math.round((profitMargin / prod.costPrice) * 100)}% লাভ)</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              <div className="font-semibold text-slate-700">৳{productInvest}</div>
                              <div className="text-[9px] text-slate-400">স্টক মূল্য: ৳{prod.stock * prod.costPrice}</div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs">
                              <div className="flex items-center justify-end gap-1.5" id={`actions-prod-${prod.id}`}>
                                {addingStockProductId === prod.id ? (
                                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200" id={`add-stock-box-${prod.id}`}>
                                    <input
                                      type="number"
                                      placeholder="পরিমাণ"
                                      value={stockToAdd}
                                      onChange={(e) => setStockToAdd(e.target.value)}
                                      className="w-14 px-1.5 py-0.5 text-xs border border-slate-200 bg-white rounded focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleAddStockSubmit(prod.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded cursor-pointer"
                                      title="নিশ্চিত করুন"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setAddingStockProductId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1 rounded cursor-pointer"
                                      title="বাতিল"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : deletingProductId === prod.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-150 animate-pulse" id={`table-delete-confirm-${prod.id}`}>
                                    <span className="text-[9px] font-bold text-rose-700 pl-1">মুছবেন?</span>
                                    <button
                                      onClick={() => {
                                        onDeleteProduct(prod.id);
                                        setDeletingProductId(null);
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                    >
                                      হ্যাঁ
                                    </button>
                                    <button
                                      onClick={() => setDeletingProductId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                    >
                                      না
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setAddingStockProductId(prod.id);
                                        setStockToAdd('');
                                      }}
                                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold px-2 py-1 rounded text-[10px] transition-all duration-150 cursor-pointer"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      স্টক বাড়ান
                                    </button>
                                    <button
                                      onClick={() => startEditingProduct(prod)}
                                      className="p-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded transition-all duration-150 cursor-pointer"
                                      title="সংশোধন করুন"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeletingProductId(prod.id);
                                      }}
                                      className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 rounded transition-all duration-150 cursor-pointer"
                                      title="মুছে ফেলুন"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ORDERS TAB */}
      {activeAdminTab === 'orders' && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
          id="orders-tab-content"
        >
          {/* Order Filters */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3" id="orders-filter-container">
            <div className="relative w-full md:max-w-xs" id="order-search-wrapper">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="অর্ডার আইডি, কাস্টমার বা প্রোডাক্ট..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200" id="order-status-tabs">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  orderStatusFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                সব অর্ডার ({orders.length})
              </button>
              <button
                onClick={() => setOrderStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  orderStatusFilter === 'pending' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                পেন্ডিং ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setOrderStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  orderStatusFilter === 'delivered' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ডেলিভার্ড ({orders.filter(o => o.status === 'delivered').length})
              </button>
              <button
                onClick={() => setOrderStatusFilter('cancelled')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  orderStatusFilter === 'cancelled' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                বাতিল ({orders.filter(o => o.status === 'cancelled').length})
              </button>
            </div>
          </div>

          {/* Orders Grid/List */}
          <div className="space-y-3" id="orders-list-wrapper">
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-lg border border-slate-200 text-slate-400 text-xs font-semibold">
                কোনো কাস্টমার অর্ডার খুঁজে পাওয়া যায়নি!
              </div>
            ) : (
              filteredOrders.map(order => {
                const product = products.find(p => p.id === order.productId);
                const itemCostPrice = product ? product.costPrice : 0;
                const profitEarned = order.status === 'delivered' ? (order.totalPrice - (order.quantity * itemCostPrice)) : 0;

                return (
                  <div 
                    key={order.id} 
                    className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden hover:border-slate-300 transition-all duration-150"
                    id={`order-card-${order.id}`}
                  >
                    {/* Header info */}
                    <div className="bg-slate-50 px-4 py-2 flex flex-wrap justify-between items-center border-b border-slate-200 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">ID: {order.id}</span>
                        <span className="text-slate-400 text-[11px] font-medium">{new Date(order.createdAt).toLocaleString('bn-BD')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 animate-pulse">
                            ● পেন্ডিং অর্ডার
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                            ✓ ডেলিভারি সম্পন্ন
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                            ✕ বাতিল করা হয়েছে
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content details */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4" id={`order-details-grid-${order.id}`}>
                      {/* Customer info */}
                      <div className="space-y-1 text-[11px] md:border-r md:border-slate-150 md:pr-4">
                        <p className="font-extrabold text-slate-400 text-[9px] uppercase tracking-wider mb-1">গ্রাহকের বিবরণ</p>
                        <p className="text-xs font-bold text-slate-800">{order.customerName}</p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-500">মোবাইল:</span> {order.customerPhone}
                        </p>
                        <p className="text-slate-600 leading-snug">
                          <span className="font-semibold text-slate-500">ঠিকানা:</span> {order.customerAddress}
                        </p>
                      </div>

                      {/* Items Ordered */}
                      <div className="space-y-1 text-[11px] md:border-r md:border-slate-150 md:pr-4">
                        <p className="font-extrabold text-slate-400 text-[9px] uppercase tracking-wider mb-1">অর্ডারের পণ্য</p>
                        <p className="text-xs font-bold text-slate-800">{order.productName}</p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-500">পরিমাণ:</span> {order.quantity} {product?.unit === 'kg' ? 'কেজি' : 'পিস'}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-500">পেমেন্ট পদ্ধতি:</span> {order.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'অনলাইন পেমেন্ট'}
                        </p>
                        {order.paymentMethod === 'online' && (
                          <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl text-[10px] space-y-0.5 mt-1.5 shadow-2xs">
                            <p className="text-indigo-950 font-extrabold flex items-center gap-1">
                              💳 পেমেন্ট ভেরিফিকেশন:
                            </p>
                            <p className="text-slate-700"><b>প্রেরক নম্বর:</b> <span className="font-mono text-slate-900">{order.paymentNumber || 'দেওয়া হয়নি'}</span></p>
                            <p className="text-slate-700"><b>TrxID:</b> <span className="font-mono font-bold text-indigo-700">{order.trxId || 'দেওয়া হয়নি'}</span></p>
                          </div>
                        )}
                      </div>
                      {/* Financial info & Actions */}
                      <div className="flex flex-col justify-between" id={`order-calc-col-${order.id}`}>
                        <div>
                          <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider mb-2">হিসাব বিবরণী</p>
                          <p className="text-lg font-bold text-gray-900">৳ {order.totalPrice}</p>
                          
                          {order.status === 'delivered' ? (
                            <div className="mt-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl inline-flex flex-col">
                              <span className="text-[10px] font-semibold text-emerald-600 uppercase">অর্জিত নিট প্রফিট</span>
                              <span className="font-extrabold text-sm">৳ {profitEarned} Tk</span>
                            </div>
                          ) : order.status === 'pending' ? (
                            <div className="mt-2 text-gray-400 text-[10px]">
                              ডেলিভারি সম্পূর্ণ হলে প্রফিটে যোগ হবে (সম্ভাব্য লাভ: ৳ {order.totalPrice - (order.quantity * itemCostPrice)} Tk)
                            </div>
                          ) : (
                            <div className="mt-2 text-rose-400 text-[10px]">
                              বাতিল অর্ডারে কোনো লাভ বা বিক্রয় নেই
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {order.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-4" id={`pending-actions-${order.id}`}>
                            {cancellingOrderId === order.id ? (
                              <div className="flex-1 flex items-center justify-between gap-2 bg-rose-50 p-2 rounded-xl border border-rose-200" id={`order-cancel-confirm-${order.id}`}>
                                <span className="text-xs font-bold text-rose-700">বাতিল করতে চান?</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      onUpdateOrderStatus(order.id, 'cancelled');
                                      setCancellingOrderId(null);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-lg text-xs cursor-pointer shrink-0"
                                  >
                                    হ্যাঁ
                                  </button>
                                  <button
                                    onClick={() => setCancellingOrderId(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1 rounded-lg text-xs cursor-pointer shrink-0"
                                  >
                                    না
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  ডেলিভারি সম্পন্ন করুন
                                </button>
                                <button
                                  onClick={() => {
                                    setCancellingOrderId(order.id);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold py-2.5 px-3 rounded-xl transition-all duration-150 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  অর্ডার বাতিল করুন
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* SUB ADMINS TAB */}
      {activeAdminTab === 'subadmins' && isMainAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
          id="subadmins-tab-content"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Add Subadmin Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                নতুন সাব-অ্যাডমিন যুক্ত করুন
              </h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.elements.namedItem('subAdminEmail') as HTMLInputElement;
                const email = emailInput.value.trim().toLowerCase();
                if (!email) return;
                
                if (email === 'ventegksy@gmail.com') {
                  alert('মেইন অ্যাডমিন ইমেইলটি স্বয়ংক্রিয়ভাবে ফুল অ্যাক্সেস প্রাপ্ত!');
                  return;
                }
                
                if (subAdmins.some(sa => sa.email === email)) {
                  alert('এই ইমেইলটি ইতিমধ্যে সাব-অ্যাডমিন হিসেবে যুক্ত আছে!');
                  return;
                }

                // Simple email pattern check
                if (!/\S+@\S+\.\S+/.test(email)) {
                  alert('অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন!');
                  return;
                }

                try {
                  await onAddSubAdmin(email);
                  emailInput.value = '';
                  alert('সাব-অ্যাডমিন সফলভাবে যুক্ত করা হয়েছে!');
                } catch (err) {
                  console.error(err);
                  alert('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
                }
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">সাব-অ্যাডমিন ইমেইল</label>
                  <input
                    name="subAdminEmail"
                    type="email"
                    required
                    placeholder="যেমন: helper@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  সাব-অ্যাডমিন যোগ করুন
                </button>
              </form>
            </div>

            {/* Subadmins list */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-2">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                নিবন্ধিত সাব-অ্যাডমিন তালিকা ({subAdmins.length} জন)
              </h3>

              {subAdmins.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  কোনো সাব-অ্যাডমিন পাওয়া যায়নি! নতুন সাব-অ্যাডমিন যোগ করতে বাম পাশের ফর্মটি ব্যবহার করুন।
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden">
                  {subAdmins.map((subAdmin) => (
                    <div key={subAdmin.email} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0" id={`subadmin-row-${subAdmin.email}`}>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-950">{subAdmin.email}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          যুক্ত করেছেন: <span className="text-slate-500">{subAdmin.addedBy}</span> • সময়: {new Date(subAdmin.addedAt).toLocaleDateString('bn-BD')} {new Date(subAdmin.addedAt).toLocaleTimeString('bn-BD')}
                        </p>
                      </div>

                      {removingSubAdminEmail === subAdmin.email ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-xl border border-rose-200" id={`subadmin-remove-confirm-${subAdmin.email}`}>
                          <span className="text-[10px] font-bold text-rose-700">অপসারণ?</span>
                          <button
                            onClick={async () => {
                              try {
                                await onRemoveSubAdmin(subAdmin.email);
                                setRemovingSubAdminEmail(null);
                                alert('সাব-অ্যাডমিন সফলভাবে অপসারিত হয়েছে!');
                              } catch (err) {
                                console.error(err);
                                alert('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                          >
                            হ্যাঁ
                          </button>
                          <button
                            onClick={() => setRemovingSubAdminEmail(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                          >
                            না
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRemovingSubAdminEmail(subAdmin.email);
                          }}
                          className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors duration-150 cursor-pointer"
                          title="অপসারণ করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeAdminTab === 'notifications' && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
          id="notifications-tab-content"
        >
          {/* AI Automation & Telegram Bot Status Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-md space-y-4" id="ai-automation-status-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-indigo-300">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold flex items-center gap-2 text-white">
                    গুগল জেমিনি এআই ও টেলিগ্রাম বট অটোমেশন
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                      সক্রিয় (Active)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">Node.js ব্যাকএন্ডে স্বয়ংক্রিয় গ্রাহক সেবা এবং মেসজিং নোটিফিকেশন সিস্টেম</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold bg-indigo-900/60 border border-indigo-700/50 px-3 py-1.5 rounded-xl text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>মডেল: Gemini 3.6 Flash</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">টেলিগ্রাম বট আইডি</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">@venteg_bot</span>
                <p className="text-[10px] text-slate-400 leading-normal">টেলিগ্রামে গ্রাহকরা এই বটে মেসেজ দিলে এআই দিয়ে উত্তর যাবে।</p>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">বট টোকেন সংযোগ</span>
                <span className="text-indigo-300 font-mono font-bold">8796371486:...doqT9-k</span>
                <p className="text-[10px] text-slate-400 leading-normal">HTTP API ব্যাকএন্ড সার্ভারে ১০০% ফ্রিতে যুক্ত করা হয়েছে।</p>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">অটোমেশন সুবিধাসমূহ</span>
                <ul className="text-[10px] text-slate-300 space-y-1">
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> কাস্টমার প্রশ্নের ২৪/৭ অটো এআই উত্তর</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> নতুন অর্ডারের সাথে সাথে টেলিগ্রাম অ্যালার্ট</li>
                </ul>
              </div>
            </div>

            {/* Test Gemini AI in Admin Panel */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                জেমিনি এআই রেসপন্স লাইভ টেস্ট করুন (Live Gemini Test)
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTestPrompt}
                  onChange={(e) => setAiTestPrompt(e.target.value)}
                  placeholder="যেমন: ভেন্ট্যাগ স্টোরে কি কি পণ্য পাওয়া যায়?"
                  className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTestAi();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={aiTestLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {aiTestLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  টেস্ট করুন
                </button>
              </div>

              {aiTestResponse && (
                <div className="bg-slate-900 p-3 rounded-xl border border-indigo-800/80 text-xs text-indigo-100 space-y-1 leading-relaxed">
                  <span className="text-[10px] text-indigo-400 font-bold block">Gemini AI উত্তর:</span>
                  <p className="whitespace-pre-wrap">{aiTestResponse}</p>
                </div>
              )}
            </div>
          </div>
          {/* Notification Sound Settings Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 p-5 rounded-2xl border border-indigo-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="sound-control-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  {soundEnabled ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  অর্ডার নোটিফিকেশন সাউন্ড সেটিংস
                </h3>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-3xl">
                কাস্টমার নতুন কোনো অর্ডার সাবমিট করলে বা নতুন নোটিফিকেশন আসলে এই সাউন্ডটি স্বয়ংক্রিয়ভাবে প্লে হবে। আধুনিক ব্রাউজারের অটো-প্লে নিরাপত্তা পলিসি সচল রাখতে অনুগ্রহ করে নোটিফিকেশন সাউন্ড চালু (Unmute) করে অন্তত একবার নিচের <strong>"সাউন্ড টেস্ট করুন"</strong> বাটনে ক্লিক করুন।
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              {/* Play Test Sound button */}
              <button
                type="button"
                onClick={() => {
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch((err) => {
                    console.log('Test sound file failed, falling back to synthesis:', err);
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
                      playNote(523.25, audioCtx.currentTime, 0.15); // C5
                      playNote(659.25, audioCtx.currentTime + 0.12, 0.3); // E5
                    } catch (e) {
                      console.error(e);
                    }
                  });
                }}
                className="px-3.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                title="সাউন্ড টেস্ট করুন"
              >
                <BellRing className="w-3.5 h-3.5" />
                সাউন্ড টেস্ট করুন
              </button>

              {/* Mute/Unmute Toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                className={`px-4 py-2 font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                  soundEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                }`}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    সাউন্ড সচল (🔊)
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    সাউন্ড বন্ধ (🔇)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* FCM Credentials & VAPID Key Pair */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit md:col-span-1">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                কী পেয়ার (VAPID Key) কনফিগারেশন
              </h3>
              
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">পাবলিক কী পেয়ার (VAPID Public Key)</span>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[9px] text-slate-600 break-all select-all flex justify-between items-start gap-2">
                    <span>BHnOlNZqE0u1UP0kWvu4Oa0gF5ds55aRfOkPMBkIh5YIDXUVpaXPcaksOj0MGsvktgNLX2bU-mVGgwI3E4oli3k</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('BHnOlNZqE0u1UP0kWvu4Oa0gF5ds55aRfOkPMBkIh5YIDXUVpaXPcaksOj0MGsvktgNLX2bU-mVGgwI3E4oli3k');
                        alert('কী পেয়ার সফলভাবে কপি করা হয়েছে!');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer p-0.5 hover:bg-slate-150 rounded"
                      title="কপি করুন"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">ডিভাইস নোটিফিকেশন পারমিশন</span>
                  <div className="flex items-center gap-2">
                    {notificationPermission === 'granted' ? (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-150 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        অনুমতি দেওয়া হয়েছে (Granted)
                      </span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="bg-rose-50 text-rose-600 border border-rose-150 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        প্রত্যাখ্যাত (Denied)
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-600 border border-amber-150 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        জিজ্ঞাসা করা হবে (Default)
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 my-2"></div>

                <button
                  onClick={onRegisterPush}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <BellRing className="w-4 h-4" />
                  পুশ নোটিফিকেশন চালু করুন
                </button>
                
                {fcmToken && (
                  <div className="space-y-1 pt-1.5">
                    <span className="block text-[10px] font-black text-slate-400 uppercase">নিবন্ধিত FCM টোকেন</span>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[8px] text-slate-400 break-all select-all flex justify-between items-center">
                      <span className="truncate max-w-[200px]">{fcmToken}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(fcmToken);
                          alert('FCM টোকেন কপি করা হয়েছে!');
                        }}
                        className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Send / Broadcast Notification Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-1 h-fit">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                টেস্ট নোটিফিকেশন ব্রডকাস্ট
              </h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const titleInput = form.elements.namedItem('notifTitle') as HTMLInputElement;
                const bodyInput = form.elements.namedItem('notifBody') as HTMLTextAreaElement;
                const targetSelect = form.elements.namedItem('notifTarget') as HTMLSelectElement;
                
                const title = titleInput.value.trim();
                const body = bodyInput.value.trim();
                const target = targetSelect.value;
                
                if (!title || !body) {
                  alert('অনুগ্রহ করে শিরোনাম ও বার্তা লিখুন!');
                  return;
                }

                try {
                  const { addNotificationLog } = await import('../firebaseService');
                  await addNotificationLog(title, body, target as any);
                  titleInput.value = '';
                  bodyInput.value = '';
                  alert('নোটিফিকেশন সফলভাবে ব্রডকাস্ট করা হয়েছে!');
                } catch (err) {
                  console.error(err);
                  alert('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
                }
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">টার্গেট গ্রাহক</label>
                  <select
                    name="notifTarget"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="admin">শুধুমাত্র অ্যাডমিন প্যানেল</option>
                    <option value="customer">শুধুমাত্র কাস্টমার প্যানেল</option>
                    <option value="all">সবাইকে (সকল প্যানেল)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">নোটিফিকেশন শিরোনাম</label>
                  <input
                    name="notifTitle"
                    type="text"
                    required
                    placeholder="যেমন: আজকের বিশেষ অফার! 🌟"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">নোটিফিকেশন বার্তা</label>
                  <textarea
                    name="notifBody"
                    required
                    rows={2}
                    placeholder="বার্তাটি বিস্তারিত বাংলায় লিখুন..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <BellRing className="w-4 h-4" />
                  টেস্ট বার্তা ব্রডকাস্ট করুন
                </button>
              </form>
            </div>

            {/* Subscriber Devices List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-1 h-fit">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                নিবন্ধিত নোটিফিকেশন টোকেন ও ডিভাইস
              </h3>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  নিচের ডিভাইসগুলো পুশ নোটিফিকেশন রিসিভ করার জন্য সাকসেসফুলি রেজিস্টার হয়েছে।
                </p>
                
                <div className="divide-y divide-slate-100">
                  <div className="space-y-2 py-1.5">
                    <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 text-[11px] flex justify-between items-center">
                      <span className="font-bold text-slate-700">ডিভাইস ১ (বর্তমান ব্রাউজার)</span>
                      <span className="text-[9px] text-indigo-600 font-bold bg-white border border-indigo-200 px-1.5 py-0.2 rounded">সক্রিয়</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-1">
                      রিয়েল-টাইম Firestore ব্রডকাস্ট চ্যানেল সক্রিয় রয়েছে।
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Beautiful and Clean Edit Product Modal Overlay */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="edit-product-modal-backdrop">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col my-8"
              id="edit-product-modal-card"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center" id="edit-modal-header">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                    পণ্য সংশোধন করুন (Edit Product)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">পণ্যের সকল বিবরণ সাবধানে আপডেট করুন</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleEditProductSubmit} className="p-6 space-y-4" id="edit-modal-form">
                {editFormError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2" id="edit-form-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                    {editFormError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">পণ্যের নাম (বাংলায়) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editProdName}
                      onChange={(e) => setEditProdName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ক্যাটাগরি</label>
                      <select
                        value={editProdCategory}
                        onChange={(e) => setEditProdCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">পরিমাপের একক</label>
                      <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditProdUnit('kg')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 ${
                            editProdUnit === 'kg' 
                              ? 'bg-white text-slate-900 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          কেজি (kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditProdUnit('piece')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 ${
                            editProdUnit === 'piece' 
                              ? 'bg-white text-slate-900 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          পিস / সংখ্যা
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ক্রয় মূল্য (৳) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editProdCostPrice}
                        onChange={(e) => setEditProdCostPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">বিক্রয় মূল্য (৳) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editProdSellingPrice}
                        onChange={(e) => setEditProdSellingPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">অবশিষ্ট স্টক <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editProdStock}
                        onChange={(e) => setEditProdStock(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-bold text-indigo-700"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1 leading-normal">স্টকে থাকা বর্তমান পরিমাণ</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">মোট যুক্ত স্টক <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editProdTotalAddedQty}
                        onChange={(e) => setEditProdTotalAddedQty(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1 leading-normal">মোট কেনা/বিনিয়োগ করা স্টক</span>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-100" id="edit-modal-footer">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer text-center shadow-xs"
                  >
                    তথ্য সংরক্ষণ করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
