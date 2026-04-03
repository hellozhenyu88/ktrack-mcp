import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  BarChart3, 
  AlertTriangle, 
  Settings,
  Search,
  Bell,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileCheck,
  TrendingUp,
  Activity,
  Filter,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Building2,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc, 
  where,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

type AdminTab = 'overview' | 'users' | 'tasks' | 'audit' | 'data' | 'disputes' | 'settings';

const CHART_DATA = [
  { name: '周一', value: 45000 },
  { name: '周二', value: 52000 },
  { name: '周三', value: 48000 },
  { name: '周四', value: 61000 },
  { name: '周五', value: 55000 },
  { name: '周六', value: 67000 },
  { name: '周日', value: 72000 },
];

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time data listeners
  useEffect(() => {
    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubDisputes = onSnapshot(query(collection(db, 'disputes'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDisputes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => {
      unsubTasks();
      unsubUsers();
      unsubDisputes();
    };
  }, []);

  const stats = useMemo(() => {
    const totalVolume = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
    const pendingAudit = tasks.filter(t => t.status === 'pending_audit').length;
    const activeFreelancers = users.filter(u => u.role === 'freelancer' && u.status === 'active').length;
    const activeEnterprises = users.filter(u => u.role === 'enterprise' && u.status === 'active').length;

    return {
      totalVolume,
      pendingAudit,
      activeFreelancers,
      activeEnterprises,
      totalUsers: users.length,
      totalTasks: tasks.length
    };
  }, [tasks, users]);

  const handleUpdateStatus = async (collectionName: string, id: string, status: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), { status });
      alert('状态已更新');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('更新失败');
    }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '平台总交易额', value: `¥${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12.5%' },
          { label: '待审核任务', value: stats.pendingAudit, icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50', trend: '需尽快处理' },
          { label: '活跃自由职业者', value: stats.activeFreelancers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+8.2%' },
          { label: '活跃企业客户', value: stats.activeEnterprises, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+5.4%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className={`p-3 rounded-2xl w-fit mb-4 ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className="text-[10px] font-bold text-emerald-600 mb-1">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-900">平台交易趋势</h3>
            <select className="text-xs font-bold text-gray-500 bg-gray-50 border-none rounded-lg px-3 py-1.5 focus:ring-0">
              <option>最近 7 天</option>
              <option>最近 30 天</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">系统健康度</h3>
          <div className="space-y-6">
            {[
              { label: '服务器负载', value: '24%', status: 'normal' },
              { label: '数据库延迟', value: '12ms', status: 'normal' },
              { label: '存储空间', value: '45%', status: 'normal' },
              { label: 'API 错误率', value: '0.02%', status: 'normal' },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400 uppercase tracking-wider">{item.label}</span>
                  <span className="text-gray-900">{item.value}</span>
                </div>
                <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: item.value }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">最近活动</h3>
          <button className="text-sm font-bold text-blue-600">查看全部日志</button>
        </div>
        <div className="divide-y divide-gray-50">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">新任务发布: {task.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {task.createdAt?.toDate()?.toLocaleString()} • 预算 ¥{task.budget}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索用户姓名、邮箱或 UID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold flex items-center gap-2">
            <Filter className="w-4 h-4" /> 筛选
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">
            导出数据
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50">
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">用户信息</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">角色</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">状态</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">注册时间</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.filter(u => u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold">
                      {user.displayName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.displayName || '未设置姓名'}</p>
                      <p className="text-[10px] font-medium text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    user.role === 'enterprise' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {user.role === 'enterprise' ? '企业' : '自由职业者'}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      user.status === 'active' ? 'bg-emerald-500' : user.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'
                    }`}></div>
                    <span className="text-xs font-bold text-gray-700">
                      {user.status === 'active' ? '正常' : user.status === 'suspended' ? '已禁用' : '待认证'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs font-medium text-gray-500">
                  {user.createdAt?.toDate()?.toLocaleDateString()}
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="p-2 text-gray-400 hover:text-gray-900">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="col-span-2 space-y-6">
        <h3 className="text-lg font-bold text-gray-900">待审核任务 ({tasks.filter(t => t.status === 'pending_audit').length})</h3>
        <div className="space-y-4">
          {tasks.filter(t => t.status === 'pending_audit').length === 0 && (
            <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-medium">暂无待审核任务</p>
            </div>
          )}
          {tasks.filter(t => t.status === 'pending_audit').map(task => (
            <div key={task.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{task.name}</h4>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{task.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">¥{task.budget}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">预算总额</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 line-clamp-3">
                {task.description}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleUpdateStatus('tasks', task.id, 'open')}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> 批准发布
                </button>
                <button 
                  onClick={() => handleUpdateStatus('tasks', task.id, 'rejected')}
                  className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> 驳回申请
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900">KYC 认证审核</h3>
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {users.filter(u => u.status === 'pending_kyc').map(user => (
              <div key={user.id} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">L3 认证申请</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus('users', user.id, 'active')}
                    className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    通过
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('users', user.id, 'suspended')}
                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
            {users.filter(u => u.status === 'pending_kyc').length === 0 && (
              <div className="p-12 text-center text-gray-400 text-sm font-medium">
                暂无待审核 KYC
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDisputes = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">争议仲裁中心</h3>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {disputes.filter(d => d.status === 'pending').length} 个待处理
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {disputes.map(dispute => (
          <div key={dispute.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex gap-8">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">争议单 #{dispute.id.slice(-6).toUpperCase()}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    关联任务 ID: {dispute.taskId} • 举报人: {dispute.reporterId}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  dispute.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {dispute.status === 'pending' ? '待处理' : '已解决'}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
                {dispute.reason}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleUpdateStatus('disputes', dispute.id, 'resolved')}
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                >
                  介入仲裁
                </button>
                <button 
                  onClick={() => handleUpdateStatus('disputes', dispute.id, 'dismissed')}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  驳回争议
                </button>
              </div>
            </div>
          </div>
        ))}
        {disputes.length === 0 && (
          <div className="bg-white p-20 rounded-[48px] border border-dashed border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">平台环境安全</h4>
            <p className="text-gray-400 font-medium">当前暂无任何未处理的争议单</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索任务名称、类型或 ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold">
            <TrendingUp className="w-4 h-4" />
            总结算金额: ¥{tasks.reduce((acc, t) => acc + (t.budget || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50">
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">任务信息</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">发布者</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">承接人</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">结算金额</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">状态</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.filter(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.type?.toLowerCase().includes(searchQuery.toLowerCase())).map(task => (
              <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{task.name}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{task.type}</p>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-bold text-gray-700">{users.find(u => u.uid === task.authorId)?.displayName || '未知企业'}</p>
                  <p className="text-[10px] text-gray-400 font-medium truncate max-w-[100px]">{task.authorId}</p>
                </td>
                <td className="px-8 py-5">
                  {task.selectedFreelancerId ? (
                    <div>
                      <p className="text-xs font-bold text-gray-700">{users.find(u => u.uid === task.selectedFreelancerId)?.displayName || '自由职业者'}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate max-w-[100px]">{task.selectedFreelancerId}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">尚未承接</span>
                  )}
                </td>
                <td className="px-8 py-5">
                  <p className="text-sm font-bold text-gray-900">¥{task.budget?.toLocaleString()}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    task.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                    task.status === 'waiting-confirmation' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {task.status === 'open' && '招募中'}
                    {task.status === 'waiting-confirmation' && '待确认'}
                    {task.status === 'in-progress' && '执行中'}
                    {task.status === 'completed' && '已完成'}
                    {task.status === 'pending_audit' && '审核中'}
                    {task.status === 'rejected' && '已驳回'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="p-2 text-gray-400 hover:text-gray-900">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-100 p-8 flex flex-col gap-10 sticky top-0 h-screen shrink-0 shadow-sm">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <Shield className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none">灵工通</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">管理后台</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'overview', label: '运营概览', icon: Shield },
            { id: 'users', label: '用户管理', icon: Users },
            { id: 'tasks', label: '任务管理', icon: Briefcase },
            { id: 'audit', label: '审核队列', icon: FileCheck },
            { id: 'data', label: '运营数据', icon: BarChart3 },
            { id: 'disputes', label: '争议仲裁', icon: AlertTriangle },
            { id: 'settings', label: '系统设置', icon: Settings },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-gray-100">
          <button className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold hover:text-red-500 transition-colors">
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 p-12 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {activeTab === 'overview' && '运营概览'}
                {activeTab === 'users' && '用户管理'}
                {activeTab === 'tasks' && '任务管理'}
                {activeTab === 'audit' && '审核队列'}
                {activeTab === 'data' && '运营数据'}
                {activeTab === 'disputes' && '争议仲裁'}
                {activeTab === 'settings' && '系统设置'}
              </h1>
              <p className="text-sm text-gray-500 font-medium">平台运营与合规监管系统</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative p-2 bg-white border border-gray-100 rounded-xl shadow-sm cursor-pointer">
                <Bell className="w-6 h-6 text-gray-400" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">超级管理员</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">系统中心</p>
                </div>
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold">
                  AD
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'tasks' && renderTasks()}
            {activeTab === 'audit' && renderAudit()}
            {activeTab === 'disputes' && renderDisputes()}
            {activeTab === 'data' && (
              <div className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-sm text-center">
                <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">高级运营分析</h3>
                <p className="text-gray-500 font-medium mb-8">正在集成多维数据分析引擎，敬请期待</p>
                <div className="max-w-md mx-auto h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CHART_DATA}>
                      <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-8">系统全局设置</h3>
                <div className="space-y-8">
                  {[
                    { label: '平台抽佣比例', value: '10%', desc: '每笔交易平台收取的服务费百分比' },
                    { label: '自动审核阈值', value: '¥5,000', desc: '低于此金额的任务将自动通过 AI 审核' },
                    { label: '提现审核周期', value: 'T+1', desc: '自由职业者发起提现后的处理时效' },
                    { label: '争议处理时限', value: '24小时', desc: '客服介入处理争议单的承诺时效' },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.label}</p>
                        <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-blue-600">{s.value}</span>
                        <button className="text-xs font-bold text-gray-400 hover:text-gray-900">修改</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
