import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RaceBoard from './components/RaceBoard';
import HistoryList from './components/HistoryList';
import AdminPanel from './components/AdminPanel';
import { supabase } from './supabaseClient';
import { Sparkles, Activity, FileText, Loader2, User, Check, Settings } from 'lucide-react';

const formatKoDate = (dateInput) => {
  let d;
  if (!dateInput) {
    d = new Date();
  } else {
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  }
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];
  return `${month}월 ${date}일 (${dayName})`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [histories, setHistories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(() => {
    const saved = localStorage.getItem('run_sweat_user_id');
    return saved ? Number(saved) : null;
  });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('run_sweat_admin_unlocked') === 'true';
  });
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAvatar, setNewMemberAvatar] = useState('🏃‍♂️');

  const [currentDateStr, setCurrentDateStr] = useState(() => formatKoDate());

  useEffect(() => {
    fetchData();
  }, [currentDateStr]);

  // Periodically check if the date has changed (e.g., past midnight) to auto-reset/refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const freshDateStr = formatKoDate();
      setCurrentDateStr(prev => {
        if (prev !== freshDateStr) {
          return freshDateStr;
        }
        return prev;
      });
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Force show profile selector if no user is selected
  useEffect(() => {
    if (!currentUserId && members.length > 0) {
      setShowProfileSelector(true);
    }
  }, [currentUserId, members]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch members and runs in parallel
      const [membersRes, runsRes] = await Promise.all([
        supabase.from('members').select('*').order('id', { ascending: true }),
        supabase.from('runs').select('*').order('id', { ascending: false })
      ]);
      
      if (membersRes.error) throw membersRes.error;
      if (runsRes.error) throw runsRes.error;

      const dbMembers = membersRes.data;
      const dbRuns = runsRes.data;

      const todayStr = formatKoDate();

      // Auto-reset today_completed in DB if it's a new day and there is no run today
      const membersToReset = dbMembers.filter(m => {
        const hasRunToday = dbRuns.some(r => r.name === m.name && r.date === todayStr);
        return m.today_completed && !hasRunToday;
      });

      if (membersToReset.length > 0) {
        const idsToReset = membersToReset.map(m => m.id);
        const { error: resetError } = await supabase
          .from('members')
          .update({ today_completed: false })
          .in('id', idsToReset);
        
        if (resetError) {
          console.error("Auto-reset today_completed error:", resetError);
        } else {
          dbMembers.forEach(m => {
            if (idsToReset.includes(m.id)) {
              m.today_completed = false;
            }
          });
        }
      }

      const mappedMembers = dbMembers.map(m => {
        // Calculate today's completion status dynamically based on current date runs
        const hasRunToday = dbRuns.some(r => r.name === m.name && r.date === todayStr);
        return {
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          morningRuns: m.morning_runs,
          totalRuns: m.total_runs,
          todayCompleted: hasRunToday,
          lastDistance: Number(m.last_distance),
          lastDuration: Number(m.last_duration),
          lastTime: m.last_time,
          lastRunType: m.last_run_type,
          isMe: m.is_me
        };
      });
      setMembers(mappedMembers);

      const mappedRuns = dbRuns.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        distance: Number(r.distance),
        duration: Number(r.duration),
        time: r.time,
        date: r.date,
        isMorning: r.is_morning,
        imageUrl: r.image_url
      }));
      setHistories(mappedRuns);

      // 3. Fetch audit logs
      const { data: dbLogs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(10);

      if (logsError) {
        console.error("Audit logs fetch error:", logsError);
      } else {
        const mappedLogs = dbLogs.map(l => ({
          id: l.id,
          actionType: l.action_type,
          editorName: l.editor_name,
          runnerName: l.runner_name,
          details: l.details,
          createdAt: l.created_at
        }));
        setAuditLogs(mappedLogs);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = members.find(m => m.id === currentUserId) || members[0] || { name: '선택 안됨', avatar: '❓', morningRuns: 0, totalRuns: 0, todayCompleted: false };

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

  const recalculateMemberStats = async (memberName) => {
    try {
      // 1. Query all runs for this member
      const { data: userRuns, error: fetchError } = await supabase
        .from('runs')
        .select('*')
        .eq('name', memberName)
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;

      // 2. Aggregate stats
      const totalRuns = userRuns.length;
      const morningRuns = userRuns.filter(r => r.is_morning).length;
      
      const todayStr = formatKoDate();
      const todayCompleted = userRuns.some(r => r.date === todayStr);

      let lastDistance = 0;
      let lastDuration = 0;
      let lastTime = '';
      let lastRunType = '';

      if (userRuns.length > 0) {
        lastDistance = Number(userRuns[0].distance);
        lastDuration = Number(userRuns[0].duration);
        lastTime = userRuns[0].time;
        lastRunType = userRuns[0].is_morning ? 'morning' : 'regular';
      }

      // 3. Update member row
      const { error: updateError } = await supabase
        .from('members')
        .update({
          total_runs: totalRuns,
          morning_runs: morningRuns,
          today_completed: todayCompleted,
          last_distance: lastDistance,
          last_duration: lastDuration,
          last_time: lastTime,
          last_run_type: lastRunType
        })
        .eq('name', memberName);

      if (updateError) throw updateError;
    } catch (err) {
      console.error("Recalculate stats error for member:", memberName, err);
    }
  };

  const handleUploadSuccess = async (runData) => {
    if (!currentUserId) {
      setShowProfileSelector(true);
      return;
    }
    
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
          is_morning: runData.isMorning,
          image_url: runData.imageUrl
        }]);

      if (runError) throw runError;

      // 2. Recalculate member stats
      await recalculateMemberStats(currentUser.name);

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error("Upload handler error:", err);
      alert("데이터 전송 중 오류가 발생했습니다: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("이름을 입력해주세요!");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('members')
        .insert([{
          name: newMemberName.trim(),
          avatar: newMemberAvatar.trim() || '🏃‍♂️'
        }]);
      if (error) throw error;
      
      setNewMemberName('');
      setNewMemberAvatar('🏃‍♂️');
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      console.error("Error adding member:", err);
      alert("멤버 추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRun = async (runId, updatedData) => {
    try {
      setLoading(true);
      // 1. Fetch the old run to know the original details
      const { data: oldRun, error: fetchError } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .single();
      if (fetchError) throw fetchError;

      // 2. Update the run
      const { error: updateError } = await supabase
        .from('runs')
        .update({
          distance: updatedData.distance,
          duration: updatedData.duration,
          time: updatedData.time,
          date: updatedData.date,
          is_morning: updatedData.isMorning
        })
        .eq('id', runId);
      if (updateError) throw updateError;

      // 3. Generate description of changes
      const changes = [];
      if (Number(oldRun.distance) !== Number(updatedData.distance)) {
        changes.push(`거리: ${oldRun.distance}km -> ${updatedData.distance}km`);
      }
      if (Number(oldRun.duration) !== Number(updatedData.duration)) {
        changes.push(`시간: ${oldRun.duration}분 -> ${updatedData.duration}분`);
      }
      const oldTimeText = oldRun.is_morning ? '오전' : '오후';
      const newTimeText = updatedData.isMorning ? '오전' : '오후';
      if (oldTimeText !== newTimeText || oldRun.time !== updatedData.time) {
        changes.push(`활동시간대: ${oldRun.time || oldTimeText} -> ${updatedData.time || newTimeText}`);
      }
      if (oldRun.date !== updatedData.date) {
        changes.push(`날짜: ${oldRun.date} -> ${updatedData.date}`);
      }

      const changeSummary = changes.length > 0 ? changes.join(', ') : '상세정보 변경';
      const logDetails = `${currentUser.name}님이 ${oldRun.name}님의 ${oldRun.date} 인증을 수정함 (${changeSummary})`;

      // 4. Write edit log to audit_logs
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          action_type: 'EDIT',
          editor_name: currentUser.name,
          runner_name: oldRun.name,
          details: logDetails
        }]);
      if (logError) console.error("Edit audit log error:", logError);

      // 5. Recalculate stats
      await recalculateMemberStats(oldRun.name);

      await fetchData();
    } catch (err) {
      console.error("Edit run error:", err);
      alert("인증 수정 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRun = async (runId) => {
    if (!window.confirm("정말 이 인증 기록을 삭제하시겠습니까? (멤버의 주간 달리기 횟수도 함께 재계산됩니다.)")) {
      return;
    }
    try {
      setLoading(true);
      // 1. Fetch the run to know the runner and stats
      const { data: runToDelete, error: fetchError } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .single();
      if (fetchError) throw fetchError;

      // 2. Delete the run
      const { error: deleteError } = await supabase
        .from('runs')
        .delete()
        .eq('id', runId);
      if (deleteError) throw deleteError;

      // 3. Write deletion log in audit_logs
      const logDetails = `${currentUser.name}님이 ${runToDelete.name}님의 ${runToDelete.date} 인증을 삭제함 (거리: ${runToDelete.distance}km, 시간: ${runToDelete.duration}분, ${runToDelete.time})`;
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          action_type: 'DELETE',
          editor_name: currentUser.name,
          runner_name: runToDelete.name,
          details: logDetails
        }]);
      if (logError) console.error("Deletion audit log error:", logError);

      // 4. Recalculate stats
      await recalculateMemberStats(runToDelete.name);

      await fetchData();
    } catch (err) {
      console.error("Delete run error:", err);
      alert("인증 삭제 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = () => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem('run_sweat_admin_unlocked', 'true');
  };

  const handleLock = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('run_sweat_admin_unlocked');
  };

  const handleResetAllData = async () => {
    if (!window.confirm("⚠️ 경고: 모든 러닝 인증 내역(runs 테이블) 및 히스토리 피드를 삭제하고 크루원들의 주간 통계(morning_runs, total_runs, today_completed 등)를 0으로 초기화하시겠습니까?")) {
      return;
    }
    if (!window.confirm("⚠️ 마지막 경고: 이 작업은 절대 되돌릴 수 없습니다. 정말로 진행하시겠습니까?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Delete all runs
      const { error: deleteRunsError } = await supabase
        .from('runs')
        .delete()
        .neq('id', 0);
      if (deleteRunsError) throw deleteRunsError;
      
      // 2. Reset all member stats in DB
      const { error: resetMembersError } = await supabase
        .from('members')
        .update({
          morning_runs: 0,
          total_runs: 0,
          today_completed: false,
          last_distance: 0,
          last_duration: 0,
          last_time: '',
          last_run_type: ''
        })
        .neq('id', 0);
      if (resetMembersError) throw resetMembersError;
      
      // 3. Delete all audit logs
      const { error: deleteLogsError } = await supabase
        .from('audit_logs')
        .delete()
        .neq('id', 0);
      if (deleteLogsError) throw deleteLogsError;
      
      // 4. Write a new reset event log in audit_logs
      const logDetails = `${currentUser.name}님이 모든 러닝 인증 내역 및 주간 통계를 초기화(리셋)했습니다.`;
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          action_type: 'RESET',
          editor_name: currentUser.name,
          runner_name: 'ALL',
          details: logDetails
        }]);
      if (logError) console.error("Reset audit log error:", logError);
      
      alert("✅ 모든 인증 데이터, 히스토리 피드 및 주간 통계가 성공적으로 초기화되었습니다!");
      await fetchData();
    } catch (err) {
      console.error("Reset all data error:", err);
      alert("초기화 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameMember = async (memberId, oldName, newName) => {
    if (!newName.trim()) {
      alert("이름을 입력해주세요!");
      return;
    }
    if (oldName === newName.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Update name in members table
      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({ name: newName.trim() })
        .eq('id', memberId);
      if (memberUpdateError) throw memberUpdateError;
      
      // 2. Update name in runs table to preserve history
      const { error: runsUpdateError } = await supabase
        .from('runs')
        .update({ name: newName.trim() })
        .eq('name', oldName);
      if (runsUpdateError) throw runsUpdateError;
      
      // 3. Write rename log in audit_logs
      const logDetails = `${currentUser.name}님이 크루원 이름을 수정함 (${oldName} -> ${newName.trim()})`;
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          action_type: 'RENAME_MEMBER',
          editor_name: currentUser.name,
          runner_name: oldName,
          details: logDetails
        }]);
      if (logError) console.error("Rename member audit log error:", logError);
      
      alert(`✅ 크루원 이름이 수정되었습니다. (${oldName} -> ${newName.trim()})`);
      await fetchData();
    } catch (err) {
      console.error("Rename member error:", err);
      alert("크루원 이름 수정 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (id) => {
    setCurrentUserId(id);
    localStorage.setItem('run_sweat_user_id', id);
    setShowProfileSelector(false);
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
            {/* User Profile Selector Trigger */}
            <button 
              onClick={() => setShowProfileSelector(true)}
              className="text-xs bg-brand-charcoal hover:bg-slate-800 text-slate-200 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 transition"
            >
              <User size={13} className="text-brand-cyan" />
              접속자: <span className="text-brand-neon">{currentUser.avatar} {currentUser.name}</span>
            </button>

            <span className="hidden md:flex text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 items-center gap-1.5">
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
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'border-brand-neon text-brand-neon font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Settings size={14} /> 관리자
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
              <RaceBoard members={members} currentUserId={currentUserId} />
            )}

            {activeTab === 'feed' && (
              <HistoryList 
                histories={histories} 
                onDeleteRun={handleDeleteRun} 
                onEditRun={handleEditRun}
                auditLogs={auditLogs}
                isAdminUnlocked={isAdminUnlocked}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPanel
                isAdminUnlocked={isAdminUnlocked}
                onUnlock={handleUnlock}
                onLock={handleLock}
                onResetAllData={handleResetAllData}
                histories={histories}
                onDeleteRun={handleDeleteRun}
                onEditRun={handleEditRun}
                members={members}
                onRenameMember={handleRenameMember}
              />
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

      {/* 접속자 프로필 선택 모달 */}
      {showProfileSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border-slate-700 shadow-2xl animate-neon-pulse">
            <h3 className="font-extrabold text-xl text-white text-center mb-2">🏃‍♂️ RunSweat 챌린지</h3>
            <p className="text-xs text-slate-400 text-center mb-6">접속 중인 크루원을 선택해 주세요!</p>

            <div className="space-y-3">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition ${
                    member.id === currentUserId
                      ? 'bg-brand-neon/15 border-brand-neon text-brand-neon'
                      : 'bg-brand-charcoal hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{member.avatar}</span>
                    <span className="font-semibold text-sm">{member.name}</span>
                  </div>
                  {member.id === currentUserId && <Check size={16} />}
                </button>
              ))}
            </div>

            {/* 새 멤버 추가 버튼 및 입력 폼 */}
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5"
                >
                  ➕ 새로운 크루원 추가하기
                </button>
              ) : (
                <form onSubmit={handleAddMember} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex gap-2">
                    <div className="w-1/4">
                      <label className="block text-[10px] text-slate-500 mb-1 font-medium">아이콘(이모지)</label>
                      <input
                        type="text"
                        value={newMemberAvatar}
                        onChange={(e) => setNewMemberAvatar(e.target.value)}
                        placeholder="🏃‍♂️"
                        maxLength="4"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-center text-sm focus:border-brand-cyan focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-1 font-medium">이름</label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="이름 입력 (예: 홍길동)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-sm focus:border-brand-cyan focus:outline-none text-white font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-cyan/25 hover:bg-brand-cyan/35 text-brand-cyan py-1.5 rounded-lg text-xs font-bold transition border border-brand-cyan/45 shadow-cyan-glow"
                    >
                      크루원 등록!
                    </button>
                  </div>
                </form>
              )}
            </div>

            {currentUserId && (
              <button 
                onClick={() => setShowProfileSelector(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs mt-6 transition"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
