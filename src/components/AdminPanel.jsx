import React, { useState } from 'react';
import { Lock, Unlock, RefreshCw, Trash2, Edit, ShieldAlert } from 'lucide-react';

export default function AdminPanel({ 
  isAdminUnlocked, 
  onUnlock, 
  onLock, 
  onResetAllData, 
  histories, 
  onDeleteRun, 
  onEditRun,
  members,
  onRenameMember,
  onUpdatePassword
}) {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const handlePromptRename = (member) => {
    const newName = window.prompt(`'${member.name}' 크루원의 새 이름을 입력하세요:`, member.name);
    if (newName && newName.trim() && newName.trim() !== member.name) {
      onRenameMember(member.id, member.name, newName.trim());
    }
  };

  const handlePromptUpdatePassword = (member) => {
    const newPassword = window.prompt(`'${member.name}' 크루원의 새로운 2자리 비밀번호를 입력하세요:`, member.password || '00');
    if (newPassword !== null) {
      const trimmed = newPassword.trim();
      if (trimmed.length !== 2 || isNaN(trimmed)) {
        alert("비밀번호는 반드시 2자리 숫자여야 합니다!");
        return;
      }
      onUpdatePassword(member.id, trimmed);
    }
  };

  // For editing a run inside admin panel
  const [editingRun, setEditingRun] = useState(null);
  const [editDistance, setEditDistance] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTime, setEditTime] = useState('오전');
  const [editIsMorning, setEditIsMorning] = useState(true);
  const [editDate, setEditDate] = useState('');

  const handleSubmitPasscode = (e) => {
    e.preventDefault();
    if (passcode === '0001') {
      onUnlock();
      setErrorMsg('');
      setPasscode('');
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다. 다시 입력해주세요.');
      setPasscode('');
    }
  };

  const handleOpenEdit = (run) => {
    setEditingRun(run);
    setEditDistance(run.distance.toString());
    setEditDuration(run.duration.toString());
    setEditTime(run.time || (run.isMorning ? '오전' : '오후'));
    setEditIsMorning(run.isMorning);
    setEditDate(run.date);
  };

  const handleSaveEdit = () => {
    const dist = parseFloat(editDistance);
    const dur = parseFloat(editDuration);
    if (isNaN(dist) || isNaN(dur)) {
      alert("거리와 시간은 숫자로 입력하셔야 합니다!");
      return;
    }
    if (dist < 5.0 && dur < 30) {
      alert("❌ 운동 불인정! 5km 이상 또는 30분 이상 달리기 기준을 만족해야 합니다.");
      return;
    }
    if (!editDate.trim()) {
      alert("날짜를 입력해주세요!");
      return;
    }

    onEditRun(editingRun.id, {
      distance: dist,
      duration: dur,
      time: editTime,
      isMorning: editIsMorning,
      date: editDate.trim()
    });
    setEditingRun(null);
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="glass-panel rounded-2xl p-8 border-slate-800 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
            <Lock className="text-brand-cyan animate-pulse" size={28} />
          </div>
          <h3 className="text-xl font-extrabold text-white mb-2">관리자 모드 잠금</h3>
          <p className="text-xs text-slate-400 mb-6">
            피드 수정 및 인증 초기화 작업을 진행하려면 <br />
            관리자 비밀번호를 입력해 주세요.
          </p>

          <form onSubmit={handleSubmitPasscode} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-center text-sm font-semibold tracking-widest focus:border-brand-cyan focus:outline-none text-white transition-all"
              autoFocus
            />
            {errorMsg && <p className="text-xs text-brand-red font-medium">{errorMsg}</p>}
            <button
              type="submit"
              className="w-full bg-brand-cyan/20 hover:bg-brand-cyan/35 text-brand-cyan border border-brand-cyan/40 font-bold py-3 rounded-xl text-xs transition shadow-cyan-glow"
            >
              🔓 잠금 해제
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Status bar */}
      <div className="glass-panel rounded-2xl p-4 border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-neon/15 text-brand-neon">
            <Unlock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">관리자 권한 활성화됨</h3>
            <p className="text-[10px] text-slate-400">데이터 전체 초기화 및 피드 수정을 진행할 수 있습니다.</p>
          </div>
        </div>
        <button
          onClick={onLock}
          className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 font-semibold transition"
        >
          🔒 관리자 세션 종료
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Danger Zone */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel border-brand-red/30 bg-brand-red/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand-red">
              <ShieldAlert size={20} />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Danger Zone</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              이번 주차 도전을 마치고 다음 주차 도전을 시작할 때 사용합니다. <br />
              <strong>주의:</strong> 모든 러닝 인증 기록(`runs` 테이블)이 삭제되고, 모든 크루원의 달리기 통계가 `0`으로 리셋됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            <button
              onClick={onResetAllData}
              className="w-full bg-brand-red/20 hover:bg-brand-red/35 text-brand-red border border-brand-red/40 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 hover:shadow-red-glow"
            >
              <RefreshCw size={14} />
              이번 주 데이터 전체 초기화
            </button>
          </div>

          <div className="glass-panel border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">👥 크루원 정보 관리</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              크루원의 이름과 2자리 로그인 비밀번호를 관리합니다.
            </p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {members && members.map((m) => (
                <div key={m.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-900/60">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.avatar}</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{m.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">비밀번호: <strong className="text-brand-cyan">{m.password || '00'}</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePromptRename(m)}
                      className="text-[10px] bg-slate-850 hover:bg-brand-cyan/20 hover:text-brand-cyan text-slate-300 font-bold px-2 py-1 rounded transition border border-slate-800 hover:border-brand-cyan/30"
                      title="이름 변경"
                    >
                      이름
                    </button>
                    <button
                      onClick={() => handlePromptUpdatePassword(m)}
                      className="text-[10px] bg-slate-850 hover:bg-brand-cyan/20 hover:text-brand-cyan text-slate-300 font-bold px-2 py-1 rounded transition border border-slate-800 hover:border-brand-cyan/30"
                      title="비밀번호 변경"
                    >
                      비번
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Run list management */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">피드 업로드 내역 관리 ({histories.length}건)</h3>
              <span className="text-[10px] text-slate-400">수정/삭제 시 감사로그에 자동 기록됩니다.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">러너</th>
                    <th className="py-2.5 px-3">날짜</th>
                    <th className="py-2.5 px-3">기록</th>
                    <th className="py-2.5 px-3">시간대</th>
                    <th className="py-2.5 px-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {histories.length > 0 ? (
                    histories.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <span className="text-base">{run.avatar}</span>
                          <span>{run.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{run.date}</td>
                        <td className="py-3 px-3 text-slate-300 font-mono">
                          {run.distance}km / {run.duration}분
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            run.isMorning 
                              ? 'bg-brand-cyan/10 text-brand-cyan' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {run.isMorning ? '오전' : '오후'} ({run.time})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(run)}
                              className="p-1.5 bg-slate-800 hover:bg-brand-cyan/20 hover:text-brand-cyan rounded text-slate-400 transition"
                              title="수정"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => onDeleteRun(run.id)}
                              className="p-1.5 bg-slate-800 hover:bg-brand-red/20 hover:text-brand-red rounded text-slate-400 transition"
                              title="삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500 italic">
                        업로드된 인증 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal inside Admin Panel */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border-slate-700 shadow-2xl relative">
            <button 
              onClick={() => setEditingRun(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold p-1"
            >
              ✕
            </button>

            <h3 className="font-extrabold text-lg text-white mb-4">
              ✏️ {editingRun.name}의 인증 기록 수정 (관리자)
            </h3>

            <div className="space-y-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold">활동 날짜</label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  placeholder="예: 6월 4일 (목)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-brand-cyan focus:outline-none font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">러닝 거리 (km)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={editDistance}
                      onChange={(e) => setEditDistance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-brand-cyan focus:outline-none pr-8 font-medium font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">km</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">달린 시간 (분)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-brand-cyan focus:outline-none pr-8 font-medium font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">분</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1.5 font-semibold">활동 시간대</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsMorning(true);
                      setEditTime('오전');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      editIsMorning
                        ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-cyan-glow'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    오전 🌅
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsMorning(false);
                      setEditTime('오후');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      !editIsMorning
                        ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-cyan-glow'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    오후 🌃
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSaveEdit}
                className="flex-1 bg-gradient-to-r from-brand-neon to-[#2ECC71] text-brand-black hover:brightness-110 py-3 rounded-xl text-xs font-bold transition shadow-neon-glow"
              >
                💾 저장하기
              </button>
              <button 
                onClick={() => setEditingRun(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
