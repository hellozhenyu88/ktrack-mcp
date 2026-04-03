import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  FileText, 
  Settings,
  Search,
  Bell,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Send,
  Eye,
  MessageSquare,
  CreditCard,
  Receipt,
  ShieldCheck,
  X,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit,
  Ban,
  Download,
  Wallet,
  ArrowUpRight,
  UserCheck,
  Star,
  Building2,
  LogOut,
  Phone,
  Paperclip,
  History as HistoryIcon,
  MessageCircle,
  Mic,
  Coins,
  FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth as firebaseAuth, signInWithGoogle } from '../../firebase';

// --- Types ---
type EnterpriseTab = 'dashboard' | 'tasks' | 'talent' | 'finance' | 'messages' | 'settings';

interface EnterpriseTask {
  id: string;
  name: string;
  type: string;
  budget: number;
  expectedPeople: number;
  appliedCount: number;
  confirmedCount: number;
  status: 'draft' | 'recruiting' | 'in-progress' | 'completed' | 'cancelled';
  publishTime: string;
  progress: number;
  hasWearableDevice: boolean;
  settlementRequested: boolean;
}

interface Freelancer {
  id: string;
  name: string;
  role: string;
  rating: number;
  projectsCount: number;
  avatar: string;
  lastActive: string;
  phone: string;
  resume?: string;
  historyProjects?: string[];
  cases?: string[];
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
  type?: 'text' | 'action';
  actionType?: 'settlement' | 'voice' | 'guidance';
}

interface TaskFile {
  id: string;
  name: string;
  type: 'attachment' | 'acceptance';
  uploader: string;
  time: string;
  size: string;
}

// --- Mock Data ---
const MOCK_ENTERPRISE_TASKS: EnterpriseTask[] = [
  {
    id: 'ET001',
    name: '商城小程序 UI 重构',
    type: '前端开发',
    budget: 20000,
    expectedPeople: 2,
    appliedCount: 15,
    confirmedCount: 2,
    status: 'in-progress',
    publishTime: '2025-03-01 10:00',
    progress: 45,
    hasWearableDevice: true,
    settlementRequested: false
  },
  {
    id: 'ET002',
    name: '品牌视觉系统设计',
    type: 'UI/UX 设计',
    budget: 8000,
    expectedPeople: 1,
    appliedCount: 8,
    confirmedCount: 1,
    status: 'completed',
    publishTime: '2025-02-20 14:30',
    progress: 100,
    hasWearableDevice: false,
    settlementRequested: true
  },
  {
    id: 'ET003',
    name: 'AI 客服接口集成',
    type: '后端开发',
    budget: 12000,
    expectedPeople: 1,
    appliedCount: 5,
    confirmedCount: 0,
    status: 'recruiting',
    publishTime: '2025-03-04 09:00',
    progress: 0,
    hasWearableDevice: false,
    settlementRequested: false
  }
];

const MOCK_TALENT: Freelancer[] = [
  { 
    id: 'F001', 
    name: '张小凡', 
    role: '资深全栈开发', 
    rating: 4.9, 
    projectsCount: 12, 
    avatar: 'https://picsum.photos/seed/f1/100/100', 
    lastActive: '2小时前', 
    phone: '138-0000-1111',
    resume: '10年全栈开发经验，精通 React, Node.js, Python。曾在大型互联网公司担任技术架构师。',
    historyProjects: ['电商平台重构', 'AI 智能客服系统', '企业级 CRM 开发'],
    cases: ['某知名电商小程序 UI 重构', '跨境支付系统集成']
  },
  { 
    id: 'F002', 
    name: '李梅', 
    role: 'UI 设计师', 
    rating: 4.8, 
    projectsCount: 8, 
    avatar: 'https://picsum.photos/seed/f2/100/100', 
    lastActive: '1天前', 
    phone: '139-1111-2222',
    resume: '5年 UI/UX 设计经验，擅长移动端交互设计与品牌视觉系统构建。',
    historyProjects: ['社交 App 视觉升级', '金融理财工具设计', '品牌官网改版'],
    cases: ['灵感社区 App 界面设计', '某银行手机银行 5.0 视觉规范']
  },
  { 
    id: 'F003', 
    name: '王强', 
    role: '后端工程师', 
    rating: 4.7, 
    projectsCount: 15, 
    avatar: 'https://picsum.photos/seed/f3/100/100', 
    lastActive: '30分钟前', 
    phone: '137-2222-3333',
    resume: '8年后端开发经验，精通 Java, Go, 微服务架构。具备高并发系统处理能力。',
    historyProjects: ['分布式交易系统', '大数据处理平台', '物联网云平台'],
    cases: ['秒杀系统后端架构设计', '千万级用户量级消息推送服务']
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'F001': [
    { id: 'm1', senderId: 'F001', text: '你好，关于商城重构项目的进度我已经提交了，请查收。', time: '10:30', isMe: false },
    { id: 'm2', senderId: 'me', text: '好的，我这就去查看。', time: '10:35', isMe: true },
    { id: 'm3', senderId: 'F001', text: '另外，部分接口文档需要更新。', time: '10:40', isMe: false },
  ],
  'F002': [
    { id: 'm4', senderId: 'F002', text: '设计稿初稿已完成，在附件中。', time: '昨天', isMe: false },
  ]
};

const MOCK_FILES: TaskFile[] = [
  { id: 'file1', name: '商城重构需求文档.pdf', type: 'attachment', uploader: '智联科技', time: '2025-03-01', size: '2.4MB' },
  { id: 'file2', name: 'UI 设计稿最终版.fig', type: 'acceptance', uploader: '李梅', time: '2025-03-04', size: '15.8MB' },
  { id: 'file3', name: '后端接口定义.md', type: 'attachment', uploader: '王强', time: '2025-03-02', size: '45KB' },
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-bold text-sm">{label}</span>
  </button>
);

export default function EnterpriseApp() {
  const [activeTab, setActiveTab] = useState<EnterpriseTab>('dashboard');
  const [aiInput, setAiInput] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [showAiForm, setShowAiForm] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EnterpriseTask | null>(null);
  const [selectedFreelancerForDetail, setSelectedFreelancerForDetail] = useState<Freelancer | null>(null);
  const [aiChatMessageInput, setAiChatMessageInput] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [realTimeTasks, setRealTimeTasks] = useState<any[]>([]);
  const [taskApplications, setTaskApplications] = useState<any[]>([]);
  const [taskProgressUpdates, setTaskProgressUpdates] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync user profile to Firestore for admin visibility
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'enterprise',
            status: 'active',
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch real-time tasks
  React.useEffect(() => {
    if (!currentUser) {
      setRealTimeTasks([]);
      return;
    }
    const q = query(
      collection(db, 'tasks'), 
      where('authorId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishTime: doc.data().createdAt?.toDate()?.toLocaleString() || '刚刚'
      }));
      setRealTimeTasks(tasks);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch applications for selected task
  React.useEffect(() => {
    if (!selectedTask) {
      setTaskApplications([]);
      return;
    }
    const q = query(
      collection(db, 'applications'),
      where('taskId', '==', selectedTask.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTaskApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedTask]);

  // Fetch progress updates for selected task
  React.useEffect(() => {
    if (!selectedTask || selectedTask.status !== 'in-progress') {
      setTaskProgressUpdates([]);
      return;
    }
    const q = query(
      collection(db, 'progress_updates'),
      where('taskId', '==', selectedTask.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTaskProgressUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedTask]);

  const handleSelectFreelancer = async (application: any) => {
    if (!selectedTask) return;
    setIsProcessing(true);
    try {
      const newConfirmedCount = (selectedTask.confirmedCount || 0) + 1;
      const isFull = newConfirmedCount >= (selectedTask.expectedPeople || 1);
      
      // Update task
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        selectedFreelancerId: application.freelancerId,
        confirmedCount: newConfirmedCount,
        status: 'waiting-confirmation'
      });
      // Update application
      await updateDoc(doc(db, 'applications', application.id), {
        status: 'accepted'
      });
      alert('已确认合作！请等待自由职业者确认并开始工作。');
      setSelectedTask(null);
    } catch (error) {
      console.error("Error selecting freelancer:", error);
      alert('操作失败。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovePayment = async (taskId: string) => {
    if (!confirm("确认通过验收并支付吗？")) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'completed',
        paymentStatus: 'paid'
      });
      alert('支付成功！任务已完成。');
      setSelectedTask(null);
    } catch (error) {
      console.error("Error approving payment:", error);
      alert('支付失败。');
    } finally {
      setIsProcessing(false);
    }
  };

  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<string | null>(MOCK_TALENT[0].id);

  // Test Firestore connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  // --- AI Logic ---
  const handleAiGenerate = () => {
    const input = aiInput.trim();
    setAiChatMessages([
      { 
        role: 'ai' as const, 
        content: input 
          ? `您好！我已经收到您的初步需求：\n"${input}"\n\n为了帮您生成最准确的任务方案，我还需要确认几个关键信息：\n1. 您预计需要多少位自由职业者参与？\n2. 您的总预算大概是多少？\n3. 任务预计持续多长时间？`
          : '您好！我是您的 AI 智能助手。请告诉我您的用工需求，我会引导您完成任务发布。比如：您想招募什么样的人才？做多长时间的项目？' 
      }
    ]);
    setShowAiChat(true);
  };

  const handleSendAiChatMessage = async () => {
    if (!aiChatMessageInput.trim()) return;
    
    const userMsg = aiChatMessageInput.trim();
    const newMessages = [...aiChatMessages, { role: 'user' as const, content: userMsg }];
    setAiChatMessages(newMessages);
    setAiChatMessageInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "你是一个专业的灵工平台任务发布助手。你的任务是引导用户提供完整的用工需求，包括：1. 任务名称/内容 2. 用工人数 3. 总预算 4. 预计工期。请保持专业、亲切且简洁。如果信息已齐全，请告知用户可以点击“确认解析结果”。",
        }
      });

      // Send the whole history to maintain context
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: newMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "你是一个专业的灵工平台任务发布助手。你的任务是引导用户提供完整的用工需求，包括：1. 任务名称/内容 2. 用工人数 3. 总预算 4. 预计工期。请保持专业、亲切且简洁。如果信息已齐全，请告知用户可以点击“确认解析结果”。",
        }
      });

      const aiResponse = response.text || "抱歉，我刚才走神了，请您再说一遍。";
      setAiChatMessages([...newMessages, { role: 'ai' as const, content: aiResponse }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setAiChatMessages([...newMessages, { role: 'ai' as const, content: "抱歉，系统繁忙，请稍后再试。" }]);
    }
  };

  const confirmAiTask = async () => {
    setIsParsingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chatHistory = aiChatMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `请根据以下对话历史，解析并提取出用工任务的详细信息。对话历史如下：\n\n${chatHistory}\n\n请以 JSON 格式返回，包含以下字段：name (任务名称), type (业务类型), people (用工人数，数字), budget (总预算，数字), duration (预计工期，字符串), description (任务描述), requirements (要求列表，字符串数组)。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              people: { type: Type.NUMBER },
              budget: { type: Type.NUMBER },
              duration: { type: Type.STRING },
              description: { type: Type.STRING },
              requirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["name", "type", "people", "budget", "duration", "description", "requirements"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      setAiParsedData(parsed);
      setShowAiChat(false);
      setShowAiForm(true);
    } catch (error) {
      console.error("AI Parsing Error:", error);
      alert("AI 解析失败，请重试或手动完善信息。");
    } finally {
      setIsParsingAi(false);
    }
  };

  const handlePublishTask = async () => {
    if (!aiParsedData) return;

    if (!firebaseAuth.currentUser) {
      try {
        await signInWithGoogle();
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
      
      setShowAiForm(false);
      alert('任务已成功发布到云端！您可以在“任务管理”中查看。');
      setActiveTab('tasks');
    } catch (error) {
      console.error("Error publishing task:", error);
      alert("发布失败，请检查网络或权限设置。");
    } finally {
      setIsPublishing(false);
    }
  };
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { tasks: [], talent: [] };
    const q = searchQuery.toLowerCase();
    return {
      tasks: MOCK_ENTERPRISE_TASKS.filter(t => t.name.toLowerCase().includes(q)),
      talent: MOCK_TALENT.filter(f => f.name.toLowerCase().includes(q) || f.role.toLowerCase().includes(q))
    };
  }, [searchQuery]);

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">企业概览</h2>
          <p className="text-gray-500 font-medium mt-1">欢迎回来，智联科技管理后台</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRechargeModal(true)}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-all"
          >
            <Wallet className="w-4 h-4 text-blue-600" /> 充值
          </button>
          <button 
            onClick={handleAiGenerate}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> 发布新任务
          </button>
        </div>
      </div>

      {/* AI Magic Box */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-200" />
            <span className="text-xs font-bold uppercase tracking-widest text-blue-100">AI 智能发布</span>
          </div>
          <h3 className="text-2xl font-bold mb-6">一句话发布您的用工需求</h3>
          <div className="relative max-w-2xl">
            <textarea 
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="例如：我要找3个在上海的UI设计师，做一周的商城重构，预算1万"
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-4 pr-32 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none h-24"
            />
            <button 
              onClick={handleAiGenerate}
              className="absolute right-3 bottom-3 bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              AI 解析
            </button>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '进行中任务', value: '12', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'tasks' },
          { label: '待结算申请', value: '5', icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50', tab: 'finance' },
          { label: '累计支出', value: '¥128,400', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'finance' },
          { label: '合作人才', value: '48', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', tab: 'talent' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => setActiveTab(stat.tab as any)}
            className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-100 transition-all group"
          >
            <div className={`p-3 rounded-2xl w-fit mb-4 ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">活跃任务监控</h3>
            <button className="text-sm font-bold text-blue-600">管理全部</button>
          </div>
          <div className="p-6 space-y-6">
            {MOCK_ENTERPRISE_TASKS.filter(t => t.status === 'in-progress').map(task => (
              <div key={task.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold border border-gray-100">
                    {task.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{task.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">{task.confirmedCount} 人正在执行 • 进度 {task.progress}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${task.progress}%` }}></div>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <Eye className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">最新消息</h3>
          </div>
          <div className="p-6 space-y-6">
            {MOCK_TALENT.slice(0, 3).map(person => (
              <div key={person.id} className="flex items-center gap-4">
                <img src={person.avatar} className="w-10 h-10 rounded-xl" alt="" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-gray-900">{person.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold">{person.lastActive}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">你好，关于商城重构项目的进度我已经提交了...</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3 text-sm font-bold text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors">
              进入消息中心
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">任务管理</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索任务名称..." 
              className="bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
            />
          </div>
          <button 
            onClick={handleAiGenerate}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <PlusCircle className="w-4 h-4" /> 发布任务
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">发布时间</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">任务名称</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">业务类型</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">预算金额</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">预计/报名/确认</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">状态</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...realTimeTasks, ...MOCK_ENTERPRISE_TASKS].map(task => (
              <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-5 text-xs font-medium text-gray-500">{task.publishTime}</td>
                <td className="px-6 py-5">
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-left"
                  >
                    {task.name}
                  </button>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{task.type}</span>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-gray-900">¥{task.budget?.toLocaleString()}</td>
                <td className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{task.expectedPeople || task.people}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs font-bold text-blue-600">{task.appliedCount || 0}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs font-bold text-emerald-600">{task.confirmedCount || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge status={task.status === 'open' ? 'recruiting' : task.status} />
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setSelectedTask(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFinance = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">财务与结算</h2>
        <button 
          onClick={() => setShowRechargeModal(true)}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <PlusCircle className="w-4 h-4" /> 账户充值
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">发票与凭证</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl">已开票</button>
                <button className="px-4 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 rounded-xl">未开票</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">增值税专用发票 - 项目结算</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">2025-03-0{i} • ¥12,000.00</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-xl">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">账户可用余额</p>
            <h3 className="text-3xl font-bold mb-8">¥458,200.00</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">冻结中资金</span>
                <span className="font-bold">¥24,000.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">本月累计充值</span>
                <span className="font-bold">¥100,000.00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">完税凭证</h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">2025年0{i}月完税证明</span>
                  </div>
                  <Download className="w-4 h-4 text-blue-600 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTalent = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">人才库</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索人才、技能..." 
              className="bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {MOCK_TALENT.map(person => (
          <div key={person.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <img src={person.avatar} className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg" alt="" />
              <div>
                <h4 className="text-lg font-bold text-gray-900">{person.name}</h4>
                <p className="text-xs text-gray-500 font-medium">{person.role}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-gray-700">{person.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-sm font-bold text-gray-900">{person.projectsCount}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">合作次数</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-sm font-bold text-gray-900">{person.lastActive}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">最后活跃</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-100 active:scale-95 transition-transform">
                发起邀约
              </button>
              <button className="p-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMessages = () => {
    const selectedFreelancer = MOCK_TALENT.find(f => f.id === selectedFreelancerId);
    const messages = selectedFreelancerId ? MOCK_MESSAGES[selectedFreelancerId] || [] : [];

    return (
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex h-[700px] animate-in fade-in duration-500">
        {/* Left: Freelancer List */}
        <div className="w-80 border-r border-gray-50 flex flex-col">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">消息列表</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_TALENT.map(f => (
              <button 
                key={f.id}
                onClick={() => setSelectedFreelancerId(f.id)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-l-4 ${
                  selectedFreelancerId === f.id ? 'bg-blue-50 border-blue-600' : 'border-transparent'
                }`}
              >
                <img src={f.avatar} className="w-12 h-12 rounded-2xl" alt="" />
                <div className="text-left flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{f.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold">{f.lastActive}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{f.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-50/30">
          {selectedFreelancer ? (
            <>
              <div className="p-6 bg-white border-b border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={selectedFreelancer.avatar} className="w-10 h-10 rounded-xl" alt="" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{selectedFreelancer.name}</h4>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">在线</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><Phone className="w-5 h-5" /></button>
                  <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                      m.isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      {m.text}
                      <p className={`text-[10px] mt-1 ${m.isMe ? 'text-blue-100' : 'text-gray-400'}`}>{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="px-6 py-4 bg-white border-t border-gray-50 flex gap-3 overflow-x-auto no-scrollbar">
                <button className="shrink-0 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors">
                  <Coins className="w-4 h-4" /> 发起结算
                </button>
                <button className="shrink-0 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors">
                  <Mic className="w-4 h-4" /> 发起语音
                </button>
                <button className="shrink-0 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors">
                  <FileUp className="w-4 h-4" /> 发送指导意见
                </button>
                <button className="shrink-0 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> 确认验收
                </button>
              </div>

              <div className="p-6 bg-white border-t border-gray-50 flex gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600"><Paperclip className="w-6 h-6" /></button>
                <input 
                  type="text" 
                  placeholder="输入消息..." 
                  className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/10"
                />
                <button className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><Send className="w-5 h-5" /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 font-bold">
              请选择一个联系人开始对话
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'tasks': return renderTasks();
      case 'finance': return renderFinance();
      case 'talent': return renderTalent();
      case 'messages': return renderMessages();
      case 'settings': return <div className="p-20 text-center text-gray-400 font-bold">企业设置建设中...</div>;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-100 p-8 flex flex-col gap-10 sticky top-0 h-screen shrink-0 shadow-sm">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none">灵工通</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">企业管理端</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="控制面板" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={PlusCircle} label="任务管理" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <SidebarItem icon={Users} label="人才库" active={activeTab === 'talent'} onClick={() => setActiveTab('talent')} />
          <SidebarItem icon={Wallet} label="财务结算" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <SidebarItem icon={MessageSquare} label="消息中心" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
          <SidebarItem icon={Settings} label="企业设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="bg-blue-50 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <img src="https://picsum.photos/seed/corp/100/100" className="w-10 h-10 rounded-xl shadow-sm" alt="" />
            <div>
              <p className="text-xs font-bold text-gray-900">智联科技</p>
              <p className="text-[10px] text-blue-600 font-bold">黄金会员企业</p>
            </div>
          </div>
          <button className="w-full py-2 bg-white text-gray-500 rounded-lg text-[10px] font-bold shadow-sm hover:text-red-500 transition-colors">
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                placeholder="搜索任务、人才、发票..." 
                className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
              />
              
              {/* Search Suggestions */}
              <AnimatePresence>
                {showSearchSuggestions && searchQuery.trim() && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSearchSuggestions(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden"
                    >
                      {searchResults.tasks.length > 0 && (
                        <div className="p-4 border-b border-gray-50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">任务</p>
                          <div className="space-y-1">
                            {searchResults.tasks.map(t => (
                              <button 
                                key={t.id}
                                onClick={() => {
                                  setActiveTab('tasks');
                                  setShowSearchSuggestions(false);
                                  setSearchQuery('');
                                }}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded-xl flex items-center gap-3"
                              >
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Clock className="w-4 h-4" /></div>
                                <span className="text-sm font-bold text-gray-700">{t.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {searchResults.talent.length > 0 && (
                        <div className="p-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">人才</p>
                          <div className="space-y-1">
                            {searchResults.talent.map(f => (
                              <button 
                                key={f.id}
                                onClick={() => {
                                  setActiveTab('talent');
                                  setShowSearchSuggestions(false);
                                  setSearchQuery('');
                                }}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded-xl flex items-center gap-3"
                              >
                                <img src={f.avatar} className="w-8 h-8 rounded-lg" alt="" />
                                <span className="text-sm font-bold text-gray-700">{f.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {searchResults.tasks.length === 0 && searchResults.talent.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm font-bold">未找到相关结果</div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-6">
              <button className="relative p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-px bg-gray-100"></div>
              
              {!currentUser ? (
                <button 
                  onClick={() => signInWithGoogle()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 active:scale-95 transition-transform"
                >
                  登录
                </button>
              ) : (
                <div className="flex items-center gap-3 group relative cursor-pointer">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{currentUser.displayName || '企业用户'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">智联科技</p>
                  </div>
                  <img src={currentUser.photoURL || "https://picsum.photos/seed/admin/100/100"} className="w-10 h-10 rounded-xl shadow-md" alt="" />
                  
                  {/* Logout Dropdown */}
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                    <button className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 text-gray-700 font-bold text-sm">
                      <Settings className="w-4 h-4" /> 个人设置
                    </button>
                    <button 
                      onClick={() => signOut(firebaseAuth)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-red-50 text-red-600 font-bold text-sm border-t border-gray-50"
                    >
                      <LogOut className="w-4 h-4" /> 退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* AI Chat Modal */}
        {showAiChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl h-[80vh] rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">AI 智能需求分析</h3>
                    <p className="text-blue-100 text-xs">正在深度解析您的用工需求...</p>
                  </div>
                </div>
                <button onClick={() => setShowAiChat(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
                {aiChatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-3xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-white border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => setShowAiChat(false)}
                  className="px-8 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={aiChatMessageInput}
                    onChange={(e) => setAiChatMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAiChatMessage()}
                    placeholder="继续完善需求（如：3个人，预算2万，做两周）..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                  <button 
                    onClick={handleSendAiChatMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={confirmAiTask}
                  disabled={isParsingAi}
                  className="px-8 py-4 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isParsingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      正在解析...
                    </>
                  ) : '确认解析结果'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showAiForm && aiParsedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">确认任务详细信息</h3>
                  <p className="text-blue-100 text-sm mt-1">请核对 AI 为您生成的任务草案，确认无误后即可发布。</p>
                </div>
                <button onClick={() => setShowAiForm(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">任务名称</label>
                    <input type="text" defaultValue={aiParsedData.name} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">业务类型</label>
                    <input type="text" defaultValue={aiParsedData.type} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">预算金额 (¥)</label>
                    <input type="number" defaultValue={aiParsedData.budget} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">预计用工人数</label>
                    <input type="number" defaultValue={aiParsedData.people} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">任务周期</label>
                    <input type="text" defaultValue={aiParsedData.duration} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">任务描述</label>
                  <textarea defaultValue={aiParsedData.description} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setShowAiForm(false);
                      setShowAiChat(true);
                    }} 
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    返回修改
                  </button>
                  <button 
                    onClick={handlePublishTask} 
                    disabled={isPublishing}
                    className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isPublishing ? '正在发布...' : '确认发布任务'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Recharge Modal */}
        {showRechargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">账户充值</h3>
                    <p className="text-sm text-gray-500 font-medium">请通过对公转账完成充值</p>
                  </div>
                  <button onClick={() => setShowRechargeModal(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">收款账户名称</p>
                    <p className="text-sm font-bold text-gray-900">灵工通数字化技术（上海）有限公司</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">收款银行</p>
                    <p className="text-sm font-bold text-gray-900">招商银行上海分行张江支行</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">银行账号</p>
                    <p className="text-lg font-bold text-gray-900 tracking-wider">6214 8888 9999 0000</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-8">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    转账时请务必备注您的企业 ID：<span className="font-bold text-gray-900">CORP_ZL_88</span>。转账完成后，系统将在 15 分钟内自动入账。
                  </p>
                </div>

                <button 
                  onClick={() => setShowRechargeModal(false)}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-100 active:scale-95 transition-transform"
                >
                  我已完成转账
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex h-[80vh]"
            >
              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-8 border-b border-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">{selectedTask.type}</span>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedTask.name}</h3>
                    </div>
                    <StatusBadge status={selectedTask.status === 'open' ? 'recruiting' : selectedTask.status} />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <Clock className="w-4 h-4" /> 预计工期: {selectedTask.duration}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <ShieldCheck className="w-4 h-4" /> 资金已托管
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Progress Section */}
                  {selectedTask.status === 'in-progress' && (
                    <section>
                      <div className="flex justify-between items-end mb-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">实时工作进度</h4>
                        <span className="text-sm font-bold text-blue-600">进行中</span>
                      </div>
                      <div className="space-y-4">
                        {taskProgressUpdates.length === 0 && (
                          <div className="p-8 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">暂无进度更新</p>
                          </div>
                        )}
                        {taskProgressUpdates.map(update => (
                          <div key={update.id} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-sm text-gray-900 leading-relaxed font-medium">{update.content}</p>
                              <span className="text-[10px] font-bold text-gray-400">{update.createdAt?.toDate()?.toLocaleString()}</span>
                            </div>
                            {update.wearableData && (
                              <div className="mt-4 p-4 bg-blue-50/50 rounded-xl grid grid-cols-4 gap-4">
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">心率</p>
                                  <p className="text-sm font-bold text-blue-600">{update.wearableData.heartRate} BPM</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">步数</p>
                                  <p className="text-sm font-bold text-blue-600">{update.wearableData.steps}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">位置</p>
                                  <p className="text-sm font-bold text-blue-600">实时共享中</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">设备状态</p>
                                  <p className="text-sm font-bold text-emerald-600">在线</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Applicants Section */}
                  {selectedTask.status === 'open' && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">待审核申请 ({taskApplications.length})</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {taskApplications.length === 0 && (
                          <div className="col-span-2 p-8 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">暂无申请人</p>
                          </div>
                        )}
                        {taskApplications.map(app => (
                          <div key={app.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                            <img src={app.freelancerAvatar || `https://picsum.photos/seed/${app.freelancerId}/50/50`} className="w-12 h-12 rounded-xl" alt="" />
                            <div className="flex-1">
                              <button 
                                onClick={() => {
                                  const talent = MOCK_TALENT.find(t => t.id === app.freelancerId) || {
                                    id: app.freelancerId,
                                    name: app.freelancerName,
                                    role: '自由职业者',
                                    rating: 5.0,
                                    projectsCount: 0,
                                    avatar: app.freelancerAvatar || '',
                                    lastActive: '刚刚',
                                    resume: '该用户暂未填写简历。',
                                    historyProjects: [],
                                    cases: []
                                  };
                                  setSelectedFreelancerForDetail(talent as Freelancer);
                                }}
                                className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {app.freelancerName}
                              </button>
                              <p className="text-[10px] text-gray-500 font-bold">匹配度: 98%</p>
                            </div>
                            <button 
                              onClick={() => handleSelectFreelancer(app)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              确认合作
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Description Section */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">任务描述</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description}</p>
                  </div>
                </div>
              </div>

              <div className="w-80 bg-gray-50 p-8 flex flex-col gap-6 border-l border-gray-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">管控中心</h4>
                  <button onClick={() => setSelectedTask(null)} className="p-1.5 bg-white rounded-full shadow-sm">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">预算金额</p>
                    <p className="text-lg font-bold text-gray-900">¥{selectedTask.budget?.toLocaleString()}</p>
                  </div>
                  
                  {selectedTask.status === 'in-progress' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500">指导意见 / 修改建议</label>
                        <textarea className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="输入您的反馈意见..."></textarea>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 py-3 bg-white border border-orange-200 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-50 transition-colors">
                          打回重来
                        </button>
                        <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                          发送指导
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTask.paymentRequested && selectedTask.status !== 'completed' && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">自由职业者已申请结算</span>
                      </div>
                      <button 
                        onClick={() => handleApprovePayment(selectedTask.id)}
                        disabled={isProcessing}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        通过验收并支付
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={() => alert("投诉功能已开启，请选择投诉原因...")}
                    className="w-full py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    投诉该自由职业者
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Freelancer Detail Modal */}
        {selectedFreelancerForDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
                <button 
                  onClick={() => setSelectedFreelancerForDetail(null)}
                  className="absolute right-6 top-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-6">
                  <img src={selectedFreelancerForDetail.avatar} className="w-20 h-20 rounded-3xl border-4 border-white/20 shadow-xl" alt="" />
                  <div>
                    <h3 className="text-2xl font-bold">{selectedFreelancerForDetail.name}</h3>
                    <p className="text-blue-100 font-medium">{selectedFreelancerForDetail.role}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold">{selectedFreelancerForDetail.rating}</span>
                      <span className="mx-2 text-white/30">|</span>
                      <span className="text-sm font-bold">{selectedFreelancerForDetail.projectsCount} 次合作</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">个人简介 / 简历</h4>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    {selectedFreelancerForDetail.resume}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">历史项目</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFreelancerForDetail.historyProjects?.map((project, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold">
                        {project}
                      </span>
                    ))}
                    {(!selectedFreelancerForDetail.historyProjects || selectedFreelancerForDetail.historyProjects.length === 0) && (
                      <span className="text-xs text-gray-400">暂无历史项目记录</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">既往案例</h4>
                  <div className="space-y-3">
                    {selectedFreelancerForDetail.cases?.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{c}</span>
                      </div>
                    ))}
                    {(!selectedFreelancerForDetail.cases || selectedFreelancerForDetail.cases.length === 0) && (
                      <span className="text-xs text-gray-400">暂无既往案例展示</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedFreelancerForDetail(null)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  关闭详情
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: any }) {
  const styles: any = {
    draft: 'bg-gray-100 text-gray-500',
    recruiting: 'bg-blue-50 text-blue-600',
    'waiting-confirmation': 'bg-amber-50 text-amber-600',
    'in-progress': 'bg-indigo-50 text-indigo-600',
    completed: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-600',
    open: 'bg-blue-50 text-blue-600',
  };
  const labels: any = {
    draft: '草稿',
    recruiting: '招募中',
    'recruitment-finished': '招募完成',
    'waiting-confirmation': '等待确认',
    'in-progress': '执行中',
    completed: '已完成',
    cancelled: '已取消',
    open: '招募中',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${styles[status] || styles.recruiting}`}>
      {labels[status] || labels.recruiting}
    </span>
  );
}
