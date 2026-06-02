import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RaceBoard from './components/RaceBoard';
import HistoryList from './components/HistoryList';
import { supabase } from './supabaseClient';
import { Sparkles, Activity, FileText, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch members
      const { data: dbMembers, error: memError } = await supabase
        .from('members')
        .select('*')
        .order('id', { ascending: true });
      
      if (memError) throw memError;

      const mappedMembers = dbMembers.map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        morningRuns: m.morning_runs,
        totalRuns: m.total_runs,
        todayCompleted: m.today_completed,
        lastDistance: Number(m.last_distance),
        lastDuration: Number(m.last_duration),
        lastTime: m.last_time,
        lastRunType: m.last_run_type,
        isMe: m.is_me
      }));
      setMembers(mappedMembers);

      // 2. Fetch runs histories
      const { data: dbRuns, error: runsError } = await supabase
        .from('runs')
        .select('*')
        .order('id', { ascending: false });

      if (runsError) throw runsError;

      const mappedRuns = dbRuns.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        distance: Number(r.distance),
        duration: Number(r.duration),
        time: r.time,
        date: r.date,
        isMorning: r.is_morning
      }));
      setHistories(mappedRuns);
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = members.find(m => m.isMe) || { name: '복케이', avatar: '👑', morningRuns: 0, totalRuns: 0, todayCompleted: false };

  // Calculate default penalty candidate based on members loaded
  const getPenaltyCandidate = () => {
    if (members.length === 0) return '아잘 🔥';
    const sorted = [...members].sort((a, b) => {
      const aImmunity = a.morningRuns >= 3 || a.totalRuns >= 4;
      const bImmunity = b.morningRuns >= 3 || b.totalRuns >= 4;
      if (aImmunity && !bImmunity) return 1;
      if (!aImmunity && bImmunity) return -1;
      return a.totalRuns - b.totalRuns;
    });
    const candidate = sorted[0];
    const isImmune = candidate.morningRuns >= 3 || candidate.totalRuns >= 4;
    return isImmune ? '없음 🎯' : `${candidate.name} ${candidate.avatar}`;
  };

  const handleUploadSuccess = async (runData) => {
    try {
      setLoading(true);
      // 1. Insert new run into database
      const { error: runError } = await supabase
        .from('runs')
        .insert([{
          name: currentUser.name,
          avatar: currentUser.avatar,
          distance: runData.distance,
          duration: runData.duration,
          time: runData.time,
          date: runData.date,
          is_morning: runData.isMorning
        }]);

      if (runError) throw runError;

      // 2. Update member runs count
      const { error: memberError } = await supabase
        .from('members')
        .update({
          today_completed: true,
          total_runs: currentUser.totalRuns + 1,
          morning_runs: runData.isMorning ? currentUser.morningRuns + 1 : currentUser.morningRuns,
          last_distance: runData.distance,
          last_duration: runData.duration,
          last_time: runData.time,
          last_run_type: runData.isMorning ? 'morning' : 'regular'
        })
        .eq('is_me', true);

      if (memberError) throw memberError;

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error("Upload handler error:", err);
      alert("데이터 전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black pb-16">
      {/* Header */}
      <header className="border-b border-slate-900 bg-brand-black/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-brand-neon to-brand-cyan p-2 rounded-xl text-brand-black shadow-neon-glow">
              <Activity size={24} />
            </div>
            <div>
              <span className="font-outfit font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                RunSweat <span className="text-[10px] bg-brand-neon/20 text-brand-neon px-2 py-0.5 rounded font-inter">CHALLENGE</span>
              </span>
              <span className="text-[10px] text-slate-500 block -mt-0.5">러닝 숙제 & 벌금 독박 레이스 🏃‍♂️</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-neon" />
              이번 주 벌금 후보: <strong className="text-brand-red font-semibold font-outfit">{getPenaltyCandidate()}</strong>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-900">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'dashboard' ? 'border-brand-neon text-brand-neon font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            대시보드
          </button>
          <button 
            onClick={() => setActiveTab('race')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'race' ? 'border-brand-neon text-brand-neon font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            벌금 레이스 현황
          </button>
          <button 
            onClick={() => setActiveTab('feed')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'feed' ? 'border-brand-neon text-brand-neon font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            인증 피드
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'rules' ? 'border-brand-neon text-brand-neon font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            숙제방 규칙
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="text-brand-cyan animate-spin" size={40} />
            <p className="text-sm text-slate-400">데이터베이스에서 러닝 숙제 동기화 중...</p>
          </div>
        )}

        {/* Tab Contents */}
        {!loading && (
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <Dashboard 
                currentUser={currentUser} 
                onUploadSuccess={handleUploadSuccess} 
              />
            )}

            {activeTab === 'race' && (
              <RaceBoard members={members} />
            )}

            {activeTab === 'feed' && (
              <HistoryList histories={histories} />
            )}

            {activeTab === 'rules' && (
              <div className="glass-panel rounded-2xl p-8 border-slate-800 space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-800 pb-4 flex items-center gap-2">
                  <FileText className="text-brand-cyan" /> RunSweat 숙제방 챌린지 규칙 시스템
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-brand-neon">🏃‍♂️ 운동 인정 기준</h4>
                    <ul className="list-inside list-disc text-sm text-slate-300 space-y-2">
                      <li>거리 **5.0km 이상** 또는 시간 **30분 이상** 달리기 충족 시 인정.</li>
                      <li>하루 최대 **1회**만 인정됩니다. (여러 번 달려도 1일 1회)</li>
                      <li>가민, 스트라바 캡처 이미지 업로드를 통한 증빙 필요.</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-brand-cyan">⏰ 아침/주간 조건 (자동 판정)</h4>
                    <ul className="list-inside list-disc text-sm text-slate-300 space-y-2">
                      <li>**아침 러닝 시간대**: [오전 5시 ~ 오전 9시] 사이 활동 시작 기록.</li>
                      <li>**주간 최소 달성 조건** (택1):
                        <span className="block pl-5 mt-1 text-slate-400">• 아침 러닝 3회 이상 달성</span>
                        <span className="block pl-5 text-slate-400">• 아침+저녁 포함 총 4회 이상 달성</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-300">📅 집계 기간</h4>
                    <ul className="list-inside list-disc text-sm text-slate-300 space-y-2">
                      <li>**매주 토요일 00:00부터 금요일 12:00 (정오)**까지 집계 마감.</li>
                      <li>금요일 저녁 단체 러닝 기록은 집계 대상에서 제외됩니다.</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-brand-red">💸 페널티 및 벌금</h4>
                    <ul className="list-inside list-disc text-sm text-slate-300 space-y-2">
                      <li>금요일 낮 12시 기준 주간 조건을 충족하지 못할 시 페널티 부여.</li>
                      <li>페널티: **FNR (Friday Night Run) 뒷풀이 회식 비용 전액 쏘기!** 🍻</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
