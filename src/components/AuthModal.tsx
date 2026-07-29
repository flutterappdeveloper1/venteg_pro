import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Shield, Phone } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(''); // This serves as either Email or Phone Number input
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('পপআপ উইন্ডোটি ব্লক করা হয়েছে! দয়া করে ব্রাউজার পপআপ অনুমতি (Allow) দিন এবং আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('লগইন পপআপটি বন্ধ করা হয়েছে।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('গুগল সাইন-ইন নিষ্ক্রিয় করা আছে। দয়া করে ফায়ারবেস কনসোল থেকে এটি সচল করুন।');
      } else {
        setError(`গুগল দিয়ে লগইন করতে সমস্যা হয়েছে (ত্রুটি: ${err.code || err.message || 'unknown'})।`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('অনুগ্রহ করে সব তথ্য প্রদান করুন।');
      setLoading(false);
      return;
    }

    if (isSignUp && !name) {
      setError('অনুগ্রহ করে আপনার নাম প্রদান করুন।');
      setLoading(false);
      return;
    }

    // Convert Bengali digits to English digits
    const bnToEn = (str: string) => {
      const banglaDigits: { [key: string]: string } = {
        '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'
      };
      return str.replace(/[০-৯]/g, (digit) => banglaDigits[digit] || digit);
    };

    let processedEmail = bnToEn(email).toLowerCase().trim();

    // If input doesn't have an @, treat it as a phone number
    if (!processedEmail.includes('@')) {
      const cleaned = processedEmail.replace(/[\s-()]/g, '');
      if (cleaned.length < 6 || !/^\+?\d+$/.test(cleaned)) {
        setError('অনুগ্রহ করে সঠিক ইমেইল এড্রেস অথবা মোবাইল নম্বর প্রদান করুন!');
        setLoading(false);
        return;
      }
      processedEmail = `${cleaned}@phone.venteg`;
    }

    if (processedEmail === 'ventegksy@gmail.com') {
      if (isSignUp) {
        setError('দুঃখিত, এই ইমেইলটি শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত এবং এতে সাইন-আপ করা যাবে না!');
        setLoading(false);
        return;
      }
      if (password !== '@Venteg$ksy321@') {
        setError('অ্যাডমিন পাসওয়ার্ডটি সঠিক নয়!');
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, processedEmail, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      } else {
        // Log In
        await signInWithEmailAndPassword(auth, processedEmail, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMsg = '';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'এই ইমেইল অথবা মোবাইল নম্বরটি ইতিপূর্বে ব্যবহার করা হয়েছে!';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'ইমেইল/মোবাইল নম্বর অথবা পাসওয়ার্ডটি সঠিক নয়!';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে!';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'সঠিক ইমেইল এড্রেস অথবা মোবাইল নম্বর প্রদান করুন!';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'আপনার ফায়ারবেস কনসোলে ইমেইল ও পাসওয়ার্ড সাইন-ইন পদ্ধতি নিষ্ক্রিয় (Disabled) রয়েছে। অনুগ্রহ করে Firebase Console-এ গিয়ে Build > Authentication > Sign-in method থেকে Email/Password চালু (Enable) করুন।';
      } else {
        errorMsg = `একটি সমস্যা হয়েছে (Error: ${err.code || err.message || 'unknown'})। অনুগ্রহ করে আবার চেষ্টা করুন বা কনসোল চেক করুন।`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs" id="auth-modal-overlay">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden"
        id="auth-modal-content"
      >
        {/* Modal Header */}
        <div className="relative p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between" id="auth-modal-header">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isSignUp ? 'নতুন অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">venteg ও প্যানেল অ্যাক্সেস</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4" id="auth-form">
          {error && (
            <div className="flex gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-semibold" id="auth-error-box">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600">আপনার নাম <span className="text-rose-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="যেমন: শরিফ আহমেদ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-500 font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">ইমেইল অথবা মোবাইল নম্বর <span className="text-rose-500">*</span></label>
            <div className="relative">
              {email.trim() !== '' && /^[০-৯0-9+]/.test(email.trim()) ? (
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-fade-in" />
              ) : (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-fade-in" />
              )}
              <input
                type="text"
                placeholder="যেমন: example@gmail.com অথবা 017xxxxxxxx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">পাসওয়ার্ড <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="কমপক্ষে ৬টি অক্ষর"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-2 px-4 rounded-lg text-xs transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                অ্যাকাউন্ট তৈরি করুন
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                লগইন করুন
              </>
            )}
          </button>

          {/* Google Login Option */}
          <div className="relative flex py-1 items-center" id="auth-divider">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">অথবা</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold py-2 px-4 border border-slate-200 rounded-lg text-xs transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            গুগল দিয়ে লগইন করুন
          </button>

          {/* Toggle Link */}
          <div className="text-center pt-2 border-t border-slate-100" id="auth-toggle-link">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করতে চান? সাইন আপ করুন'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
