import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Menu, 
  X, 
  Star, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  PlusCircle,
  LayoutGrid,
  Zap,
  ArrowRight,
  Globe,
  Award,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth as firebaseAuth, signInWithGoogle } from '../../firebase';

// --- Types ---
interface Gig {
  id: string;
  title: string;
  sellerName: string;
  sellerAvatar: string;
  sellerLevel: string;
  rating: number;
  reviewsCount: number;
  price: number;
  image: string;
  category: string;
}

// --- Mock Data ---
const MOCK_GIGS: Gig[] = [
  {
    id: '1',
    title: '我将为您设计极简主义且具有品牌感的 Logo',
    sellerName: 'Alex Design',
    sellerAvatar: 'https://picsum.photos/seed/alex/100/100',
    sellerLevel: 'Level 2 Seller',
    rating: 4.9,
    reviewsCount: 124,
    price: 350,
    image: 'https://picsum.photos/seed/logo/600/400',
    category: '图形设计'
  },
  {
    id: '2',
    title: '我将为您开发高性能的 React 响应式网站',
    sellerName: 'TechPro',
    sellerAvatar: 'https://picsum.photos/seed/tech/100/100',
    sellerLevel: 'Top Rated Seller',
    rating: 5.0,
    reviewsCount: 89,
    price: 1200,
    image: 'https://picsum.photos/seed/web/600/400',
    category: '编程与科技'
  },
  {
    id: '3',
    title: '我将为您撰写高转化率的营销文案',
    sellerName: 'Writerly',
    sellerAvatar: 'https://picsum.photos/seed/writer/100/100',
    sellerLevel: 'Level 1 Seller',
    rating: 4.8,
    reviewsCount: 56,
    price: 150,
    image: 'https://picsum.photos/seed/writing/600/400',
    category: '写作与翻译'
  },
  {
    id: '4',
    title: '我将为您剪辑具有电影感的短视频内容',
    sellerName: 'VibeEdit',
    sellerAvatar: 'https://picsum.photos/seed/vibe/100/100',
    sellerLevel: 'Pro Verified',
    rating: 4.9,
    reviewsCount: 210,
    price: 450,
    image: 'https://picsum.photos/seed/video/600/400',
    category: '视频与动画'
  }
];

const CATEGORIES = [
  { name: '图形设计', icon: LayoutGrid },
  { name: '编程与科技', icon: Zap },
  { name: '写作与翻译', icon: Globe },
  { name: '视频与动画', icon: Award },
  { name: '数字营销', icon: Users },
  { name: 'AI 服务', icon: Sparkles },
];

export default function LandingPage({ onBack }: { onBack: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsParsingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const prompt = `
        你是一个专业的任务解析助手。请解析以下用工需求，并以 JSON 格式返回。
        需求内容: "${aiInput}"
        
        JSON 结构:
        {
          "name": "任务名称",
          "type": "任务类型(如: UI设计, 前端开发, 文案撰写)",
          "budget": 数字(预算金额),
          "duration": "预计工期(如: 3天, 1周)",
          "description": "详细描述",
          "requirements": ["要求1", "要求2"],
          "people": 数字(需要人数)
        }
      `;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(response.text || '{}');
      setAiParsedData(data);
    } catch (error) {
      console.error("AI Parsing Error:", error);
      alert("AI 解析失败，请重试或手动完善信息。");
    } finally {
      setIsParsingAi(false);
    }
  };

  const handlePublishTask = async () => {
    if (!aiParsedData) return;

    // Check login status before publishing
    if (!firebaseAuth.currentUser) {
      try {
        await signInWithGoogle();
        // After login, the user needs to click publish again or we can auto-continue
        // For simplicity, we'll just stop here and let them click again
        return;
      } catch (error) {
        alert("登录失败，无法发布任务。");
        return;
      }
    }

    setIsPublishing(true);
    try {
      const taskData = {
        ...aiParsedData,
        authorId: firebaseAuth.currentUser?.uid,
        status: 'open',
        selectedFreelancerId: null,
        paymentRequested: false,
        paymentStatus: 'unpaid',
        expectedPeople: aiParsedData.people || 1,
        appliedCount: 0,
        confirmedCount: 0,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      setAiParsedData(null);
      setAiInput('');
      setShowPostJobModal(false);
      alert('任务已成功发布！您可以在企业管理端查看详情。');
    } catch (error) {
      console.error("Error publishing task:", error);
      alert("发布失败，请检查网络或权限设置。");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black tracking-tighter text-blue-600">灵工通</h1>
            <div className="hidden md:flex items-center gap-6">
              <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">返回门户</button>
              <a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">探索服务</a>
              <a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">成为卖家</a>
              <a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">关于我们</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPostJobModal(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> 发布任务
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-900 md:hidden">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-blue-600 py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl md:text-6xl font-black text-white leading-tight mb-8"
            >
              为您的业务寻找完美的 <span className="text-blue-200 italic">自由职业</span> 服务
            </motion.h2>
            
            <div className="relative group max-w-2xl">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="尝试搜索 'Logo 设计' 或 '网页开发'..."
                className="w-full bg-white rounded-2xl py-6 pl-16 pr-32 text-lg font-medium shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-400/20 transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95">
                搜索
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-sm font-bold text-blue-100">热门搜索:</span>
              {['Logo 设计', 'WordPress', 'AI 艺术', '视频剪辑'].map(tag => (
                <button key={tag} className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/20 hover:bg-white/20 transition-all">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-20 top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl"></div>
      </section>

      {/* Trust Bar */}
      <div className="bg-gray-50 py-8 px-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale">
          <span className="text-xl font-black tracking-tighter">GOOGLE</span>
          <span className="text-xl font-black tracking-tighter">META</span>
          <span className="text-xl font-black tracking-tighter">NETFLIX</span>
          <span className="text-xl font-black tracking-tighter">P&G</span>
          <span className="text-xl font-black tracking-tighter">PAYPAL</span>
        </div>
      </div>

      {/* Categories */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <h3 className="text-3xl font-black text-gray-900 mb-12">热门分类</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {CATEGORIES.map((cat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group text-center"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all mx-auto mb-4">
                <cat.icon className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-900">{cat.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Gigs */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h3 className="text-3xl font-black text-gray-900">精选服务</h3>
              <p className="text-gray-500 font-medium mt-2">由平台认证的顶级自由职业者提供</p>
            </div>
            <button className="text-sm font-bold text-blue-600 flex items-center gap-2 hover:underline">
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {MOCK_GIGS.map(gig => (
              <div key={gig.id} className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <img src={gig.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-gray-900 uppercase tracking-widest">
                    {gig.category}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={gig.sellerAvatar} className="w-8 h-8 rounded-full border border-gray-100" alt="" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{gig.sellerName}</p>
                      <p className="text-[10px] font-medium text-gray-400">{gig.sellerLevel}</p>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-4 group-hover:text-blue-600 transition-colors">
                    {gig.title}
                  </h4>
                  <div className="flex items-center gap-1 mb-6">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-gray-900">{gig.rating}</span>
                    <span className="text-xs font-medium text-gray-400">({gig.reviewsCount})</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">起步价</p>
                      <p className="text-lg font-black text-gray-900">¥{gig.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="bg-gray-900 rounded-[48px] p-12 md:p-24 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
              准备好将您的 <span className="text-blue-400">创意</span> 转化为现实了吗？
            </h3>
            <p className="text-xl text-gray-400 mb-12 font-medium">
              加入全球领先的数字化用工平台，连接数百万顶尖人才。
            </p>
            <div className="flex flex-wrap gap-6">
              <button 
                onClick={() => setShowPostJobModal(true)}
                className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                立即发布任务
              </button>
              <button className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all active:scale-95">
                了解更多
              </button>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="col-span-2">
            <h1 className="text-2xl font-black tracking-tighter text-blue-600 mb-6">灵工通</h1>
            <p className="text-gray-500 font-medium max-w-xs mb-8">
              数字化灵活用工全链路解决方案，为企业与个人创造更多可能。
            </p>
            <div className="flex gap-4">
              {/* Social Icons */}
              {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100"></div>)}
            </div>
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-6">分类</h5>
            <ul className="space-y-4 text-sm font-medium text-gray-500">
              <li><a href="#" className="hover:text-blue-600 transition-colors">图形设计</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">数字营销</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">写作与翻译</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">视频与动画</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-6">关于</h5>
            <ul className="space-y-4 text-sm font-medium text-gray-500">
              <li><a href="#" className="hover:text-blue-600 transition-colors">职业机会</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">新闻中心</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">隐私政策</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">服务条款</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-6">支持</h5>
            <ul className="space-y-4 text-sm font-medium text-gray-500">
              <li><a href="#" className="hover:text-blue-600 transition-colors">帮助中心</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">信任与安全</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">联系我们</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2025 灵工通 · 数字化用工平台</p>
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-gray-400">简体中文</span>
            <span className="text-xs font-bold text-gray-400">CNY - ¥</span>
          </div>
        </div>
      </footer>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPostJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[48px] overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white relative">
                <button 
                  onClick={() => {
                    setShowPostJobModal(false);
                    setAiParsedData(null);
                    setAiInput('');
                  }}
                  className="absolute right-8 top-8 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-blue-200" />
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-100">AI 智能发布助手</span>
                </div>
                <h3 className="text-3xl font-black mb-4">描述您的用工需求</h3>
                <p className="text-blue-100 font-medium opacity-80">
                  只需一句话，AI 将为您自动生成专业的任务需求书。
                </p>
              </div>

              <div className="p-12 space-y-8">
                {!aiParsedData ? (
                  <div className="space-y-6">
                    <textarea 
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="例如：我要找一个在上海的UI设计师，做一周的商城重构，预算5000元"
                      className="w-full bg-gray-50 border border-gray-100 rounded-[32px] p-8 text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none h-48"
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isParsingAi || !aiInput.trim()}
                      className="w-full py-6 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isParsingAi ? 'AI 正在深度解析中...' : '开始 AI 智能解析'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">任务名称</p>
                        <p className="text-sm font-bold text-gray-900">{aiParsedData.name}</p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">预算金额</p>
                        <p className="text-sm font-bold text-blue-600">¥{aiParsedData.budget}</p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">预计工期</p>
                        <p className="text-sm font-bold text-gray-900">{aiParsedData.duration}</p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">任务类型</p>
                        <p className="text-sm font-bold text-gray-900">{aiParsedData.type}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">任务描述</p>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        {aiParsedData.description}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setAiParsedData(null)}
                        className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-2xl font-bold transition-all hover:bg-gray-200"
                      >
                        重新解析
                      </button>
                      <button 
                        onClick={handlePublishTask}
                        disabled={isPublishing}
                        className="flex-2 py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                      >
                        {isPublishing ? '发布中...' : firebaseAuth.currentUser ? '确认发布' : '登录并发布'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
