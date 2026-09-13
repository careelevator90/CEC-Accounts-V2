/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  TrendingDown, 
  TrendingUp, 
  FileText, 
  LogOut, 
  X,
  User,
  Settings,
  Pin,
  PinOff
} from 'lucide-react';
import { TabType } from '../types';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  userEmail: string;
  userRole?: 'Read Only' | 'Full Access';
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  userEmail, 
  userRole = 'Full Access',
  isOpen,
  setIsOpen,
  isPinned,
  setIsPinned
}: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'expense', label: 'Expenses', icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'income', label: 'Incomes', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ] as const;

  return (
    <>
      {/* Desktop Fixed Left Sidebar (Only visible when user explicitly pins it) */}
      {isPinned && (
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-screen fixed left-0 top-0 bottom-0 p-5 z-30 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-inner border border-slate-700/50 overflow-hidden shrink-0">
                <img src="https://i.postimg.cc/Jzvd6JxM/loguf.png" alt="CARE ELEVATOR CENTER" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="truncate">
                <h1 className="font-black text-xs text-white tracking-wide leading-tight truncate">
                  CARE ELEVATOR
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">ACCOUNTS HUB</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPinned(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Unpin menu to maximize full screen width"
            >
              <PinOff className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                    isActive 
                      ? 'text-white bg-slate-800 border border-slate-700/60 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer/Meta Section of Sidebar */}
          <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 truncate">
                  {userRole === 'Read Only' ? 'READ-ONLY ACCESS' : 'FULL ACCESS'}
                </p>
                <p className="text-[9px] text-slate-500 truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT</span>
            </button>
          </div>
        </aside>
      )}

      {/* Slide-over Drawer Menu (Opens smoothly on click for both Mobile & Desktop when unpinned) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 270 }}
              className="fixed left-0 top-0 bottom-0 w-72 sm:w-80 bg-slate-900 text-slate-300 p-6 z-50 flex flex-col shadow-2xl border-r border-slate-800 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-700/50 overflow-hidden shrink-0 shadow-inner">
                    <img src="https://i.postimg.cc/Jzvd6JxM/loguf.png" alt="CARE ELEVATOR CENTER" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h2 className="font-black text-xs text-white uppercase tracking-wider leading-tight">CARE ELEVATOR</h2>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">ACCOUNTS HUB</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Pin button on desktop */}
                  <button
                    onClick={() => {
                      setIsPinned(true);
                      setIsOpen(false);
                    }}
                    className="hidden lg:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Pin sidebar to left side"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Close Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Nav Items */}
              <div className="space-y-2 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'text-white bg-slate-800 border border-slate-700/70 shadow-sm' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? item.bg : 'bg-slate-800/60'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="mt-auto space-y-3 pt-5 border-t border-slate-800">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/70">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                      {userRole === 'Read Only' ? 'READ-ONLY ACCESS' : 'FULL ACCESS'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>LOGOUT</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
