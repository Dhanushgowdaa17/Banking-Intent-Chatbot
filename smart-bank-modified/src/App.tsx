import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  ShieldAlert, 
  Activity, 
  CreditCard, 
  User, 
  Send, 
  LogOut,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronDown,
  HelpCircle,
  IndianRupee,
  ShoppingBag,
  Bell,
  Zap,
  Info,
  Phone,
  KeyRound,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FAQ_OPTIONS = [
  { label: "Check my balance", value: "What is my balance?" },
  { label: "View transactions", value: "Show my transactions" },
  { label: "My Loans", value: "Check my loans" },
  { label: "My Score", value: "What is my score?" },
  { label: "Check for Scams", value: "How do I check for scams?" },
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface AccountDetails {
  balance: string;
  rewards_balance: string;
  account_type: string;
  interest_rate: string;
  credit_score: number;
  last_transactions: any[];
}

interface FinancialScore {
  score: number;
  trend: string;
  suggestions: string[];
  breakdown: any;
}

interface Insight {
  title: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high';
}

interface LoggedUser {
  customer_id: string;
  name: string;
  city?: string;
  mobile?: string;
}

export default function App() {
  // Auth State
  const [user, setUser] = useState<LoggedUser | null>(() => {
    try {
      const saved = localStorage.getItem('smart_bank_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse saved user", e);
      return null;
    }
  });
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginStep, setLoginStep] = useState<'mobile' | 'otp'>('mobile');
  const [authError, setAuthError] = useState('');

  // Main State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [score, setScore] = useState<FinancialScore | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [spendingStats, setSpendingStats] = useState<any[]>([]);
  const [financialAdvice, setFinancialAdvice] = useState<any | null>(null);
  const [loanEligibility, setLoanEligibility] = useState<any | null>(null);
  
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferStatus, setTransferStatus] = useState<{success?: boolean, message?: string} | null>(null);
  
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [balanceUpdated, setBalanceUpdated] = useState(false);
  const [fraudInput, setFraudInput] = useState('');
  const [fraudResult, setFraudResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'fraud'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchAccountData();
      fetchInsights();
      setMessages([
        { id: '1', text: `Hello ${user.name}! I am your assistant. I've checked your account for today. How can I help you?`, sender: 'bot', timestamp: new Date() }
      ]);
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAccountData = async () => {
    if (!user) return;
    try {
      const [accRes, scoreRes, statsRes, adviceRes, sipRes, loanRes] = await Promise.all([
        fetch(`/api/account-details?customer_id=${user.customer_id}`),
        fetch(`/api/financial-score?customer_id=${user.customer_id}`),
        fetch(`/api/spending-stats?customer_id=${user.customer_id}`),
        fetch(`/api/financial-advice?customer_id=${user.customer_id}`),
        fetch(`/api/sip-suggestion?customer_id=${user.customer_id}`),
        fetch(`/api/loan-eligibility?customer_id=${user.customer_id}`)
      ]);
      setAccount(await accRes.json());
      setScore(await scoreRes.json());
      setSpendingStats(await statsRes.json());
      const advice = await adviceRes.json();
      const sip = await sipRes.json();
      setFinancialAdvice({ ...advice, ...sip });
      setLoanEligibility(await loanRes.json());
    } catch (err) {
      console.error("Failed to load account data", err);
    }
  };

  const fetchFullHistory = async () => {
    if (!user) return;
    try {
      let url = `/api/transactions/full?customer_id=${user.customer_id}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      if (filterDate) url += `&date=${filterDate}`;
      const res = await fetch(url);
      setAllTransactions(await res.json());
    } catch (err) {
      console.error("Failed to load full history", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchFullHistory();
    }
  }, [activeTab, filterCategory, filterDate]);

  const fetchInsights = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/insights?customer_id=${user.customer_id}`);
      setInsights(await res.json());
    } catch (err) {
      console.error("Failed to load insights", err);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier })
      });
      const data = await res.json();
      if (res.ok) {
        setLoginStep('otp');
      } else {
        setAuthError(data.error || 'User not found');
      }
    } catch (err) {
      setAuthError('Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, otp: loginOtp })
      });
      const data = await res.json();
      if (res.ok) {
        // Clear potential stale state before setting new user
        setMessages([]);
        setAccount(null);
        setScore(null);
        setInsights([]);
        setSpendingStats([]);
        setFinancialAdvice(null);
        setLoanEligibility(null);
        setAllTransactions([]);
        setTransferStatus(null);
        setFraudResult(null);
        setFraudInput('');

        const loggedUser: LoggedUser = { 
          customer_id: data.customer_id, 
          name: data.name,
          city: data.city,
          mobile: data.mobile
        };
        setUser(loggedUser);
        localStorage.setItem('smart_bank_user', JSON.stringify(loggedUser));
      } else {
        setAuthError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setAuthError('Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smart_bank_user');
    setLoginIdentifier('');
    setLoginOtp('');
    setLoginStep('mobile');
    setMessages([]);
    setAccount(null);
    setScore(null);
    setInsights([]);
    setSpendingStats([]);
    setFinancialAdvice(null);
    setLoanEligibility(null);
    setAllTransactions([]);
    setFraudResult(null);
    setTransferStatus(null);
  };

  const handleSendMessage = async (textToSend: string = inputText) => {
    if (!user) return;
    const finalMsg = textToSend.trim();
    if (!finalMsg) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: finalMsg,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setShowFaq(false);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMsg, customer_id: user.customer_id })
      });
      const data = await res.json();
      
      let botResponse = data.response;
      if (!botResponse) {
        // AI Fallback for greetings/daily talk
        try {
          const context = `
            User Name: ${user.name}
            Account: ${account?.account_type || 'Savings'}
            Balance: ${account?.balance || 'Checking...'}
            Score: ${score?.score || 50}/100
          `;
          const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `You are a friendly bank assistant for "Smart Bank". 
            Current Context: ${context}. 
            User says: "${finalMsg}". 
            Respond naturally to greetings or daily chat. Be professional yet warm. 
            If they ask about things you can't access, politely guide them back to banking. 
            Keep it very concise. Use INR (₹).`,
          });
          botResponse = result.text || "I'm here to help! Could you please repeat that?";
        } catch (aiErr) {
          console.error("AI Fallback Error", aiErr);
          botResponse = "I'm sorry, I couldn't process that. Can you try again?";
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later.", 
        sender: 'bot', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFraud = async () => {
    if (!fraudInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fraudInput })
      });
      setFraudResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget || !transferAmount || !user) return;
    setIsLoading(true);
    setTransferStatus(null);
    try {
      const res = await fetch('/api/send-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: user.customer_id, 
          receiver_identifier: transferTarget, 
          amount: transferAmount 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTransferStatus({ success: true, message: data.message });
        if (data.cashback) {
          setTransferStatus({ success: true, message: `${data.message}. You earned ₹${data.cashback} cashback! 🎁` });
        }
        setTransferAmount('');
        setTransferTarget('');
        // Immediately update balance in UI using the value returned by the API
        if (data.newBalance !== undefined) {
          setAccount(prev => prev ? {
            ...prev,
            balance: `₹${parseFloat(data.newBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            rewards_balance: data.cashback
              ? `₹${(parseFloat(prev.rewards_balance.replace(/[₹,]/g, '')) + parseFloat(data.cashback)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : prev.rewards_balance
          } : prev);
          setBalanceUpdated(true);
          setTimeout(() => setBalanceUpdated(false), 2000);
        }
        // Also refresh full account data and history in background
        await fetchAccountData();
        fetchInsights();
        fetchFullHistory();
      } else {
        setTransferStatus({ success: false, message: data.error || 'Transaction failed' });
      }
    } catch (err) {
      setTransferStatus({ success: false, message: 'Something went wrong' });
    } finally {
      setIsLoading(false);
    }
  };

  const InsightIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'shopping-bag': return <ShoppingBag size={14} />;
      case 'trending-up': return <TrendingUp size={14} />;
      case 'alert': return <AlertTriangle size={14} />;
      default: return <Info size={14} />;
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A] items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/50 border border-white/10 p-8 rounded-[32px] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
               <div className="w-6 h-6 border-2 border-black rotate-45" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Smart Bank</h1>
            <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Secure Login</p>
          </div>

          {loginStep === 'mobile' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2 px-1">Mobile or Customer ID</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="text"
                    placeholder="9876543210 or C001"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-all font-mono"
                  />
                </div>
              </div>
              {authError && <p className="text-red-400 text-xs font-bold px-1">{authError}</p>}
              <button 
                type="submit"
                disabled={isLoading || !loginIdentifier}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Checking...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2 px-1">Enter OTP</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="text"
                    placeholder="4-digit OTP"
                    value={loginOtp}
                    maxLength={4}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-all font-mono tracking-[1em] text-center"
                  />
                </div>
                <p className="text-[10px] text-white/20 mt-4 text-center italic">OTP printed in backend console for demo</p>
              </div>
              {authError && <p className="text-red-400 text-xs font-bold px-1">{authError}</p>}
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setLoginStep('mobile')}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 transition-all"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || !loginOtp}
                  className="flex-[2] bg-white text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-[#E4E3E0] selection:text-[#0A0A0A]">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col p-6 space-y-8 bg-[#000000]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-black rotate-45"></div>
          </div>
          <span className="text-xl font-semibold tracking-tight uppercase">Smart Bank</span>
        </div>

        <nav className="flex-1 space-y-4">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-4 px-2">Menu</h3>
            <div className="space-y-1">
              {[
                { id: 'chat', label: 'Bank Chat', icon: MessageSquare },
                { id: 'dashboard', label: 'My Money', icon: Activity },
                { id: 'fraud', label: 'Check Scam', icon: ShieldAlert },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-[11px] uppercase font-bold tracking-widest",
                    activeTab === item.id 
                      ? "bg-white text-black border border-white" 
                      : "text-white/40 hover:text-white hover:bg-zinc-900 border border-transparent"
                  )}
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-4 px-2">Current Balance</h3>
            <div className={cn(
              "border rounded-2xl p-5 transition-all duration-700",
              balanceUpdated 
                ? "bg-emerald-900/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
                : "bg-zinc-900 border-white/10"
            )}>
              <p className="text-[10px] text-white/40 uppercase mb-1">Money in Account</p>
              <p className={cn(
                "text-3xl font-light tracking-tight transition-colors duration-700",
                balanceUpdated ? "text-emerald-300" : "text-white"
              )}>{account?.balance || '₹0'}</p>
              <div className="mt-4 flex justify-between items-end">
                <div className={cn(
                  "text-[10px] py-1 px-2 rounded uppercase font-bold transition-all duration-700",
                  balanceUpdated ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  {balanceUpdated ? '✓ Updated' : 'Good Progress'}
                </div>
                <div className="text-[10px] font-mono text-white/30 tracking-tighter">PRMLY-0821</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-4 px-2">Savings Score</h3>
            <div className="relative flex items-center justify-center py-6 bg-zinc-900/40 rounded-2xl border border-dashed border-white/10">
              <div className="text-center">
                <p className="text-4xl font-light">{score?.score || '--'}</p>
                <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
                  {score && score.score > 70 ? 'Prime' : score && score.score > 40 ? 'Fair' : 'Critical'}
                </p>
              </div>
              <svg className="absolute w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle 
                  cx="48" cy="48" r="40" 
                  fill="transparent" 
                  stroke={score && score.score > 70 ? "#10b981" : "#f59e0b"} 
                  strokeWidth="4" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * (score?.score || 0) / 100)} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
          </div>
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-[10px] font-mono uppercase italic">{user?.name ? user.name.substring(0, 2) : 'SB'}</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-widest truncate">{user?.name || 'User'}</p>
                <p className="text-[8px] text-white/30 uppercase tracking-widest">{user?.city || 'India'} • {account?.account_type || 'Savings'}</p>
              </div>
            </div>
            <LogOut size={14} className="text-white/40 hover:text-white cursor-pointer" onClick={handleLogout} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#050505]">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/80 backdrop-blur-md z-10 font-sans">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/60">
              {activeTab === 'chat' ? 'Secure Chat' : activeTab === 'dashboard' ? 'My Dashboard' : 'Check Scams'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <IndianRupee size={12} className="text-white/40" />
              <p className="text-[10px] font-mono text-white/60 uppercase">INR Mode</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col p-8 max-w-4xl mx-auto w-full relative z-0"
              >
                <div className="flex-1 overflow-y-auto space-y-8 pb-40 no-scrollbar">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.sender === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] p-6 rounded-2xl text-[13px] leading-relaxed relative",
                        m.sender === 'user' 
                          ? "bg-white text-black font-medium rounded-tr-none shadow-2xl" 
                          : "bg-zinc-900 text-white border border-white/10 rounded-tl-none pr-12"
                      )}>
                        {m.sender === 'bot' && <Zap size={14} className="absolute top-6 right-6 text-white/20" />}
                        {m.text.split('\n').map((line, i) => <p key={i} className={i > 0 ? "mt-3" : ""}>{line}</p>)}
                        <span className={cn(
                          "text-[9px] font-mono mt-3 block uppercase tracking-widest",
                          m.sender === 'user' ? "opacity-40" : "text-white/20"
                        )}>
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 p-5 rounded-2xl border border-white/10 rounded-tl-none flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="absolute bottom-6 left-8 right-8 max-w-4xl mx-auto">
                  <div className="relative">
                    <AnimatePresence>
                      {showFaq && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-4 w-72 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-50 backdrop-blur-xl"
                        >
                          <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Quick Menu</p>
                          </div>
                          {FAQ_OPTIONS.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(opt.value)}
                              className="w-full text-left px-4 py-3 text-xs text-white/70 hover:bg-white hover:text-black transition-colors flex items-center justify-between group"
                            >
                              <span>{opt.label}</span>
                              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText).catch(err => console.error("Send error", err)); }} className="bg-zinc-950 border border-white/10 p-2 rounded-full flex items-center shadow-2xl backdrop-blur-xl relative">
                      <button 
                        type="button"
                        onClick={() => setShowFaq(!showFaq)}
                        className={cn(
                          "p-4 rounded-full transition-colors",
                          showFaq ? "bg-white text-black" : "text-white/40 hover:bg-zinc-900 hover:text-white"
                        )}
                      >
                        <HelpCircle size={18} />
                      </button>
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask me anything about your account..."
                        className="flex-1 bg-transparent py-4 pl-4 pr-4 focus:outline-none text-sm placeholder:text-white/20"
                      />
                      <div className="flex items-center space-x-2 pr-1">
                        <button 
                          type="submit"
                          disabled={!inputText.trim() || isLoading}
                          className="bg-white text-black h-11 px-6 rounded-full font-bold text-[10px] uppercase hover:bg-zinc-200 transition-all disabled:opacity-50 tracking-widest"
                        >
                          {isLoading ? '...' : 'Send'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full overflow-y-auto p-10 space-y-12 max-w-6xl mx-auto w-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className={cn(
                    "border p-8 rounded-2xl relative group overflow-hidden transition-all duration-700",
                    balanceUpdated 
                      ? "bg-emerald-900/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                      : "bg-zinc-900 border-white/10"
                  )}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-white/10" />
                    <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-6 flex items-center">
                      <div className={cn("w-1 h-1 rounded-full mr-2", balanceUpdated ? "bg-emerald-300" : "bg-emerald-400")} />
                      Balance
                    </div>
                    <div className={cn(
                      "text-4xl font-light tracking-tighter mb-2 transition-colors duration-700",
                      balanceUpdated ? "text-emerald-300" : "text-white"
                    )}>{account?.balance || '₹0'}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                         +1.2% <span className="text-white/20 ml-2">Extra Earnings</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-white/30 uppercase font-black">Rewards</p>
                        <p className="text-xs font-bold text-white">{account?.rewards_balance || '₹0'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl relative overflow-hidden">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-6">My Score</p>
                    <div className="text-4xl font-light tracking-tighter mb-4">{score?.score || '--'}<span className="text-lg opacity-20">/100</span></div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-1000 ease-out" 
                        style={{ width: `${score?.score}%` }} 
                      />
                    </div>
                    <p className="mt-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">{score?.trend || 'Checking...'}</p>
                  </div>

                  <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-6">Money Tips</p>
                    <div className="space-y-4">
                      {insights.slice(0, 2).map((insight, idx) => (
                        <div key={idx} className="flex items-center space-x-3 text-xs">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            insight.severity === 'high' ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            <InsightIcon type={insight.icon} />
                          </div>
                          <p className="text-white/60 leading-tight">{insight.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 pt-4">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Transfer Money</h3>
                      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <form onSubmit={handleSendMoney} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Recipient (ID or Mobile)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. C002 or 9876543210"
                              value={transferTarget}
                              onChange={(e) => setTransferTarget(e.target.value)}
                              className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-xs focus:border-white/20 focus:outline-none transition-all placeholder:text-white/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Amount (INR)</label>
                            <input 
                              type="number" 
                              placeholder="₹0.00"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-xs focus:border-white/20 focus:outline-none transition-all placeholder:text-white/10"
                            />
                          </div>
                          {transferStatus && (
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-tight",
                              transferStatus.success ? "text-emerald-400" : "text-red-400"
                            )}>
                              {transferStatus.message}
                            </p>
                          )}
                          <button 
                            type="submit"
                            disabled={isLoading || !transferTarget || !transferAmount}
                            className="w-full bg-white text-black py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all disabled:opacity-50"
                          >
                            {isLoading ? 'Processing...' : 'Send Money'}
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Smart Financial Advice</h3>
                      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                        <Zap size={20} className="absolute -top-2 -right-2 text-white/5 rotate-12" />
                        <div className="space-y-4">
                          <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-[11px] text-white/80 leading-relaxed font-medium">{financialAdvice?.advice || 'Loading advice...'}</p>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <TrendingUp size={14} className="text-emerald-400" />
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">SIP Suggestion</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-white">{financialAdvice?.recommendation || 'Calculating...'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Loan Eligibility</h3>
                      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">CIBIL Score</p>
                            <p className="text-xl font-mono text-white mt-1">{loanEligibility?.cibil_score || '---'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Status</p>
                            <p className={cn(
                              "text-[10px] font-bold uppercase mt-1",
                              loanEligibility?.eligibility_status.includes('High') ? "text-emerald-400" : "text-amber-400"
                            )}>
                              {loanEligibility?.eligibility_status || 'Checking...'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] text-white/40 uppercase">Max Amount</span>
                            <span className="text-xs font-bold text-white">{loanEligibility?.max_loan_amount || '₹0'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-[10px] text-white/40 uppercase">ROI Suggestion</span>
                            <span className="text-xs font-bold text-white">{loanEligibility?.suggested_interest_rate || '0%'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Monthly Subscriptions</h3>
                      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden">
                        {/* Static list for UI demo, but would fetch from /api/subscriptions in a real app */}
                        {[
                          { name: 'Netflix', cost: '₹499' },
                          { name: 'YouTube Premium', cost: '₹129' }
                        ].map((sub, i) => (
                          <div key={i} className="flex items-center justify-between p-5 border-b border-white/5 last:border-b-0">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest">{sub.name}</p>
                              <p className="text-[10px] text-white/30 uppercase mt-1">Deducted Automatically</p>
                            </div>
                            <p className="text-sm font-mono font-bold">{sub.cost}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Spending Trend</h3>
                      <p className="text-[10px] text-white/40 uppercase font-mono tracking-tighter">Last 15 Records</p>
                    </div>
                    <div className="h-80 w-full bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spendingStats}>
                          <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 9}}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 9}}
                            dx={-10}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#18181b', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontSize: '10px',
                              color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#ffffff" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorAmount)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between pt-6">
                      <h3 className="text-[11px] uppercase tracking-[0.4em] text-white font-bold">Transaction Ledger</h3>
                      <div className="flex items-center space-x-4">
                        <input 
                          type="date" 
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="bg-zinc-900 border border-white/5 rounded-lg px-3 py-1 text-[9px] uppercase tracking-tighter text-white/40 focus:outline-none"
                        />
                         <select 
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="bg-zinc-900 border border-white/5 rounded-lg px-3 py-1 text-[9px] uppercase tracking-tighter text-white/40 focus:outline-none"
                        >
                          <option value="">All Categories</option>
                          <option value="UPI">UPI</option>
                          <option value="Food">Food</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Salary">Salary</option>
                          <option value="Transport">Transport</option>
                        </select>
                        <button 
                          onClick={() => { setFilterCategory(''); setFilterDate(''); }}
                          className="text-[9px] uppercase font-bold text-white/40 hover:text-white transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="border border-white/10 rounded-3xl overflow-hidden bg-zinc-950">
                      {allTransactions.length > 0 ? allTransactions.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-6 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors group">
                          <div className="flex items-center space-x-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-mono text-xs border transition-all",
                              t.type === 'Credit' 
                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10 group-hover:bg-emerald-500/10" 
                                : "bg-zinc-900 text-white border-white/5 group-hover:border-white/20"
                            )}>
                              {t.category ? t.category.substring(0, 2).toUpperCase() : 'TX'}
                            </div>
                            <div>
                               <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold uppercase tracking-widest text-white/90">{t.description}</p>
                                <span className="text-[8px] px-1 py-0.5 bg-white/5 text-white/30 rounded uppercase font-bold">{t.category}</span>
                               </div>
                              <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-mono mt-1">{t.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-mono text-sm font-bold", t.type === 'Credit' ? "text-emerald-400" : "text-white")}>
                              {t.type === 'Credit' ? '+' : '-'}{t.amount_formatted}
                            </p>
                            <p className="text-[8px] uppercase tracking-[0.2em] text-white/20 mt-1">Verified</p>
                          </div>
                        </div>
                      )) : (
                        <div className="p-12 text-center">
                          <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest">No matching records found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'fraud' && (
              <motion.div 
                key="fraud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-8 bg-[#020202]"
              >
                <div className="max-w-2xl w-full space-y-12 text-center relative">
                   <div className="absolute inset-0 bg-red-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
                  
                  <div className="space-y-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
                      <ShieldAlert size={14} className="text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Security Check</span>
                    </div>
                    <h2 className="text-5xl font-light tracking-tighter text-white">Check for <span className="italic opacity-30">Scams</span></h2>
                    <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed uppercase tracking-widest font-bold">
                      Paste any message or link here to see if it's safe.
                    </p>
                  </div>

                  <div className="bg-zinc-950 border border-white/10 p-2 rounded-[32px] overflow-hidden focus-within:border-white/30 transition-all shadow-2xl">
                    <textarea
                      value={fraudInput}
                      onChange={(e) => setFraudInput(e.target.value)}
                      placeholder="Paste suspicious text here..."
                      className="w-full bg-transparent p-8 min-h-[180px] focus:outline-none resize-none text-[13px] leading-relaxed placeholder:text-white/10 font-mono"
                    />
                    <div className="p-4 bg-[#050505] border-t border-white/5 flex justify-between items-center px-8">
                       <div className="flex items-center space-x-2">
                        <Lock size={12} className="text-white/20" />
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Private & Secure</span>
                      </div>
                      <button 
                        onClick={checkFraud}
                        disabled={!fraudInput.trim() || isLoading}
                        className="bg-white text-black px-10 py-3.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all disabled:opacity-50"
                      >
                       {isLoading ? 'Checking...' : 'Check Now'}
                      </button>
                    </div>
                  </div>

                  {fraudResult && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "p-10 rounded-[32px] border relative overflow-hidden backdrop-blur-xl",
                        fraudResult.prediction === 'Scam' 
                          ? "bg-red-950/20 border-red-500/30" 
                          : "bg-emerald-950/20 border-emerald-500/30"
                      )}
                    >
                      <div className="flex items-center justify-center space-x-4 mb-6">
                        {fraudResult.prediction === 'Scam' ? <AlertTriangle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
                        <h4 className={cn(
                          "text-xl font-bold uppercase tracking-[0.3em]",
                          fraudResult.prediction === 'Scam' ? "text-red-500" : "text-emerald-400"
                        )}>
                          Result: {fraudResult.prediction === 'Scam' ? 'SCAM DETECTED' : 'SAFE'}
                        </h4>
                      </div>
                      <div className="flex items-center justify-center space-x-4 mb-8">
                        <div className="text-center">
                          <p className="text-[8px] text-white/30 uppercase font-black mb-1">Risk Level</p>
                          <p className={cn("text-xs font-bold uppercase", fraudResult.riskLevel === 'High' ? "text-red-500" : "text-emerald-400")}>{fraudResult.riskLevel}</p>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[8px] text-white/30 uppercase font-black mb-1">Certainty</p>
                          <p className="text-xs font-bold font-mono">{fraudResult.probability}%</p>
                        </div>
                      </div>
                      <div className="w-full h-px bg-white/10 mb-8" />
                      <p className="text-xs text-white/70 leading-relaxed uppercase tracking-widest font-black max-w-md mx-auto">
                        "{fraudResult.reason}"
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
