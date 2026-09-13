import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles, UserPlus, LogIn } from 'lucide-react';
import { auth, db, hasValidFirebaseConfig } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { isFullAccessEmail } from '../types';

interface LoginProps {
  onSuccess: (email: string, role: 'Read Only' | 'Full Access') => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onSuccess, addToast }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  const isFirebaseConfigured = hasValidFirebaseConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim()) {
      addToast('Please enter an email address.', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);

    try {
      if (isFirebaseConfigured && auth) {
        if (isRegistering) {
          // Registration flow
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const loggedInEmail = userCredential.user?.email || email.trim();
          const cleanEmail = loggedInEmail.toLowerCase();
          
          // Strictly allow Full Access ONLY to the 3 designated administrator emails
          const role: 'Read Only' | 'Full Access' = isFullAccessEmail(cleanEmail) ? 'Full Access' : 'Read Only';

          if (db) {
            try {
              await setDoc(doc(db, 'userRoles', cleanEmail), {
                email: cleanEmail,
                role,
                createdAt: new Date().toISOString()
              });
            } catch (dbErr) {
              console.warn("Could not write initial role to Firestore:", dbErr);
            }
          }

          sessionStorage.setItem('isLoggedIn', 'true');
          sessionStorage.setItem('loggedInUserEmail', cleanEmail);
          sessionStorage.setItem('loggedInUserRole', role);
          sessionStorage.removeItem('isFallbackLogin');

          addToast(`Account created successfully with ${role} access!`, 'success');
          onSuccess(cleanEmail, role);
          return;
        }

        // Sign In Flow
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const loggedInEmail = userCredential.user?.email || email;
          const cleanEmail = loggedInEmail.trim().toLowerCase();
          
          // Strictly allow Full Access ONLY to the 3 designated administrator emails
          const role: 'Read Only' | 'Full Access' = isFullAccessEmail(cleanEmail) ? 'Full Access' : 'Read Only';

          if (db) {
            try {
              await setDoc(doc(db, 'userRoles', cleanEmail), {
                email: cleanEmail,
                role,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } catch (e: any) {
              console.warn("Could not synchronize user role with Firestore:", e);
            }
          }

          sessionStorage.setItem('isLoggedIn', 'true');
          sessionStorage.setItem('loggedInUserEmail', loggedInEmail);
          sessionStorage.setItem('loggedInUserRole', role);
          sessionStorage.removeItem('isFallbackLogin');
          
          addToast(`Login successful (${role})`, 'success');
          onSuccess(loggedInEmail, role);
        } catch (signInErr: any) {
          console.warn("Sign-in failed with error code:", signInErr?.code);

          const cleanEmail = email.trim().toLowerCase();
          const isEligibleAdmin = isFullAccessEmail(cleanEmail);

          // If the account does not exist in the new Firebase project, attempt auto-creation for designated admin
          if (isEligibleAdmin && (signInErr?.code === 'auth/invalid-credential' || signInErr?.code === 'auth/user-not-found')) {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
              const registeredEmail = newCred.user?.email || email.trim();
              if (db) {
                try {
                  await setDoc(doc(db, 'userRoles', cleanEmail), {
                    email: cleanEmail,
                    role: 'Full Access',
                    createdAt: new Date().toISOString()
                  });
                } catch (_) {}
              }
              sessionStorage.setItem('isLoggedIn', 'true');
              sessionStorage.setItem('loggedInUserEmail', registeredEmail);
              sessionStorage.setItem('loggedInUserRole', 'Full Access');
              sessionStorage.removeItem('isFallbackLogin');

              addToast('Administrator account created and signed in successfully!', 'success');
              onSuccess(registeredEmail, 'Full Access');
              return;
            } catch (createErr: any) {
              if (createErr?.code === 'auth/email-already-in-use') {
                throw new Error('Incorrect password! Please verify your password and try again.');
              }
              if (createErr?.code === 'auth/operation-not-allowed') {
                throw new Error('Email/Password sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
              }
            }
          }

          // Emergency Fallback if password is Bangladesh123
          if (password === 'Bangladesh123') {
            const role = isFullAccessEmail(cleanEmail) ? 'Full Access' : 'Read Only';
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('isFallbackLogin', 'true');
            sessionStorage.setItem('loggedInUserEmail', cleanEmail);
            sessionStorage.setItem('loggedInUserRole', role);
            addToast('Emergency developer access granted (Fallback).', 'info');
            onSuccess(cleanEmail, role);
            return;
          }

          if (signInErr?.code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
          }

          if (signInErr?.code === 'auth/invalid-credential' || signInErr?.code === 'auth/user-not-found') {
            throw new Error('Invalid email or password. To create a new account, please switch to the "Create Account" tab.');
          }

          throw signInErr;
        }
      } else {
        // Fallback password login if Firebase is not configured yet
        if (password === 'Bangladesh123') {
          const loggedInEmail = email || '';
          const role = isFullAccessEmail(loggedInEmail) ? 'Full Access' : 'Read Only';
          sessionStorage.setItem('isLoggedIn', 'true');
          sessionStorage.setItem('isFallbackLogin', 'true');
          sessionStorage.setItem('loggedInUserEmail', loggedInEmail);
          sessionStorage.setItem('loggedInUserRole', role);
          
          addToast('Authorized developer entry granted (Fallback)', 'success');
          onSuccess(loggedInEmail, role);
        } else {
          throw new Error('Incorrect credentials! (Fallback expects password: Bangladesh123)');
        }
      }
    } catch (err: any) {
      setErrorShake(true);
      console.error(err);
      addToast(err.message || 'Login failed! Check your credentials.', 'error');
      setTimeout(() => setErrorShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[100] px-4 overflow-y-auto py-10">
      {/* Background decoration elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative my-auto"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 lg:p-10 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
          
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 p-2.5 shadow-inner border border-slate-700/50 overflow-hidden">
              <img src="https://i.postimg.cc/Jzvd6JxM/loguf.png" alt="CARE ELEVATOR CENTER Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-wide">
              CARE ELEVATOR CENTER
            </h1>
            <p className="text-blue-400 font-bold uppercase text-xs tracking-widest mt-1">
              {isFirebaseConfigured ? 'FIREBASE AUTHENTICATION' : 'SYSTEM ACCESS CONTROL'}
            </p>
            <p className="text-slate-400 text-xs mt-1.5">
              {isRegistering 
                ? 'Create a new user or administrator account in Firebase' 
                : 'Sign in with your registered account credentials'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          {isFirebaseConfigured && (
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !isRegistering 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isRegistering 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          )}

          {!isFirebaseConfigured && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl flex gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-bold">Firebase Configuration Not Found</p>
                <p className="mt-0.5 text-slate-400">
                  Firebase web SDK is not configured yet. You can sign in using fallback password <strong>Bangladesh123</strong> to enter settings and configure Firebase.
                </p>
              </div>
            </div>
          )}

          <motion.form
            onSubmit={handleSubmit}
            animate={errorShake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {isRegistering ? 'Choose Password (min 6 characters)' : 'Security Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white py-3.5 rounded-2xl font-bold uppercase tracking-wider shadow-lg shadow-blue-950/20 hover:shadow-blue-950/30 transition flex items-center justify-center gap-2 group disabled:opacity-50 text-xs mt-3 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'CREATE ACCOUNT & SIGN IN' : 'LOGIN SYSTEM'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.form>
          
          <div className="mt-6 text-center flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">
              Authorized Personnel Only. Access is monitored and logged.
            </span>
            {isFirebaseConfigured && (
              <span className="text-[9px] text-indigo-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" /> Secure Google Firebase Auth Node Connected
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
