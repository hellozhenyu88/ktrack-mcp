import React, { useState } from 'react';
import EnterpriseApp from './apps/enterprise/EnterpriseApp';
import AdminApp from './apps/admin/AdminApp';
import LandingPage from './apps/website/LandingPage';
import { PlatformType } from './shared/types';
import { Shield, Briefcase, Building2, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [platform, setPlatform] = useState<PlatformType | null>(null);

  if (platform === 'enterprise') return <EnterpriseApp />;
  if (platform === 'admin') return <AdminApp />;
  if (platform === 'website') return <LandingPage onBack={() => setPlatform(null)} />;


  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 flex items-center justify-center p-12">
      <div className="w-full max-w-5xl space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-200 mx-auto mb-6">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-gray-900">灵工通 <span className="text-blue-600">Portal</span></h1>
          <p className="text-xl text-gray-500 font-medium">数字化灵活用工全链路解决方案</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <PlatformCard 
            title="自由职业者端" 
            description="移动优先：任务接单、进度提交、个税汇算与合规结算"
            icon={Briefcase}
            color="bg-blue-600"
            onClick={() => window.location.href = '/freelancer-app.html'}
          />
          <PlatformCard 
            title="企业管理端" 
            description="桌面优先：AI 智能发包、项目实时监控、财务结算与人才管理"
            icon={Building2}
            color="bg-indigo-600"
            onClick={() => setPlatform('enterprise')}
          />
          <PlatformCard 
            title="官网门户" 
            description="品牌展示：平台优势、政策解读、入驻引导与成功案例"
            icon={LayoutGrid}
            color="bg-emerald-600"
            onClick={() => setPlatform('website')}
          />
          <PlatformCard 
            title="管理后台" 
            description="系统核心：全局运营监控、合规审计、争议仲裁与风控中心"
            icon={Shield}
            color="bg-gray-900"
            onClick={() => setPlatform('admin')}
          />
        </div>

        <div className="pt-8 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            © 2025 灵工通 · 全方位灵活用工数字化解决方案
          </p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ title, description, icon: Icon, color, onClick }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5 text-left group"
    >
      <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-xs text-gray-500 font-medium">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
    </motion.button>
  );
}
