import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Eye, Award } from 'lucide-react';

export default function HistoryList({ histories, onDeleteRun, onEditRun, auditLogs, isAdminUnlocked }) {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDistance, setEditDistance] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTime, setEditTime] = useState('오전');
  const [editIsMorning, setEditIsMorning] = useState(true);
  const [editDate, setEditDate] = useState('');

  const handleOpenDetail = (history) => {
    setSelectedHistory(history);
    setIsEditing(false);
    setEditDistance(history.distance.toString());
    setEditDuration(history.duration.toString());
    setEditTime(history.time || (history.isMorning ? '오전' : '오후'));
    setEditIsMorning(history.isMorning);
    setEditDate(history.date);
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

    if (onEditRun) {
      onEditRun(selectedHistory.id, {
        distance: dist,
        duration: dur,
        time: editTime,
        isMorning: editIsMorning,
        date: editDate.trim()
      });
    }
    setSelectedHistory(null);
    setIsEditing(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          📸 주간 인증 히스토리 피드
        </h3>
        <p className="text-sm text-slate-400">
          지인들이 인증한 생생한 가민 & 스트라바 캡처 숙제 보관함입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {histories.map((history) => (
          <div 
            key={history.id} 
            className="bg-brand-charcoal border border-slate-800 rounded-xl overflow-hidden hover:border-brand-neon/40 transition group flex flex-col justify-between"
          >
            {/* Garmin Watch Face or Actual Image Uploaded */}
            <div className="bg-slate-950 h-48 flex justify-center items-center border-b border-slate-900 relative overflow-hidden">
              {history.imageUrl ? (
                <img 
                  src={history.imageUrl} 
                  alt="Garmin Sync Screenshot" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-slate-700 bg-slate-900 shadow-lg flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="absolute inset-1 rounded-full border border-slate-800" />
                  <div className="absolute top-1 text-[7px] text-slate-500 font-bold font-mono tracking-widest">GARMIN</div>
                  
                  <span className="text-[9px] text-brand-neon font-bold font-outfit uppercase mt-2">RUNNING</span>
                  <span className="text-2xl font-extrabold font-outfit text-white leading-none my-1">{history.distance.toFixed(1)}</span>
                  <span className="text-[8px] text-slate-400 font-medium uppercase font-outfit">KILOMETERS</span>
                  
                  <div className="flex gap-2.5 mt-2 border-t border-slate-800 pt-1.5 w-4/5 justify-center">
                    <div className="text-center">
                      <span className="text-[8px] text-slate-500 block font-mono">TIME</span>
                      <span className="text-[9px] font-bold text-slate-300 font-mono">{history.duration}m</span>
                    </div>
                    <div className="border-r border-slate-800" />
                    <div className="text-center">
                      <span className="text-[8px] text-slate-500 block font-mono">PACE</span>
                      <span className="text-[9px] font-bold text-slate-300 font-mono">5'30"</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Badge */}
              <span className="absolute top-3 right-3 bg-brand-neon/20 border border-brand-neon/30 text-brand-neon text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-neon-glow">
                <Award size={10} /> VERIFIED
              </span>
            </div>

            {/* Run details */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{history.avatar}</span>
                <div>
                  <span className="text-sm font-bold text-white block">{history.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {history.isMorning ? (
                      <span className="text-brand-cyan font-semibold">⚡️ 아침 러닝 성공</span>
                    ) : (
                      <span className="text-slate-400">🏃‍♂️ 일반 달리기</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/60 pt-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  <span>{history.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 justify-end">
                  <Clock size={13} className="text-slate-500" />
                  <span>{history.time}</span>
                </div>
              </div>
            </div>

            {/* View Details button */}
            <div className="px-4 pb-4">
              <button 
                onClick={() => handleOpenDetail(history)}
                className="w-full bg-slate-800 hover:bg-brand-cyan hover:text-brand-black text-slate-300 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 group-hover:shadow-cyan-glow"
              >
                <Eye size={13} /> 인증 원본 자세히 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 인증 상세 보기 모달 */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border-slate-700 shadow-2xl relative">
            <button 
              onClick={() => setSelectedHistory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedHistory.avatar}</span>
              <div>
                <h3 className="font-extrabold text-lg text-white">{selectedHistory.name}의 인증 숙제</h3>
                <p className="text-xs text-slate-400">{selectedHistory.date} | {selectedHistory.time} 제출</p>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-brand-cyan mb-2">✏️ 인증 정보 수정</h4>
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
            ) : (
              <>
                <div className="bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center mb-6 overflow-hidden w-full">
                  {selectedHistory.imageUrl ? (
                    <div className="w-full h-64 overflow-hidden relative bg-slate-950 flex justify-center items-center">
                      <img 
                        src={selectedHistory.imageUrl} 
                        alt="Garmin Sync Detail" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-8 flex justify-center items-center w-full">
                      <div className="w-48 h-48 rounded-full border-8 border-slate-700 bg-slate-900 shadow-2xl flex flex-col justify-center items-center relative">
                        <div className="absolute top-2 text-[10px] text-slate-500 font-bold font-mono tracking-widest">GARMIN</div>
                        
                        <span className="text-xs text-brand-neon font-bold font-outfit uppercase mt-3">RUNNING</span>
                        <span className="text-4xl font-extrabold font-outfit text-white leading-none my-1">{selectedHistory.distance.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-400 font-medium uppercase font-outfit">KILOMETERS</span>
                        
                        <div className="flex gap-4 mt-3 border-t border-slate-800 pt-3 w-4/5 justify-center">
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 block font-mono">DURATION</span>
                            <span className="text-xs font-bold text-slate-300 font-mono">{selectedHistory.duration}m</span>
                          </div>
                          <div className="border-r border-slate-800" />
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 block font-mono">PACE</span>
                            <span className="text-xs font-bold text-slate-300 font-mono">5'18" /km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-xl p-4 space-y-2 border border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">운동 인정 상태</span>
                    <span className="font-semibold text-brand-neon">성공 (30분 이상 / 5km 만족)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">아침 러닝 여부</span>
                    <span>
                      {selectedHistory.isMorning ? (
                        <span className="font-semibold text-brand-cyan">예 ({selectedHistory.time} 러닝)</span>
                      ) : (
                        <span className="text-slate-400">아니오 ({selectedHistory.time} 러닝)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">인증 데이터</span>
                    <span className="text-slate-200">{selectedHistory.distance}km / {selectedHistory.duration}분 / {selectedHistory.time} 인증</span>
                  </div>
                </div>
              </>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSaveEdit}
                    className="flex-1 bg-gradient-to-r from-brand-neon to-[#2ECC71] text-brand-black hover:brightness-110 py-3 rounded-xl text-xs font-bold transition shadow-neon-glow"
                  >
                    💾 변경사항 저장
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition"
                  >
                    취소
                  </button>
                </>
              ) : isAdminUnlocked ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/35 text-brand-cyan py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-cyan-glow"
                  >
                    ✏️ 이 인증 수정하기
                  </button>
                  <button 
                    onClick={() => {
                      if (onDeleteRun) {
                        onDeleteRun(selectedHistory.id);
                        setSelectedHistory(null);
                      }
                    }}
                    className="flex-1 bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/30 text-brand-red py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    🗑️ 이 인증 삭제하기
                  </button>
                  <button 
                    onClick={() => setSelectedHistory(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition"
                  >
                    닫기
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-center py-2.5 px-3 bg-slate-900 border border-slate-850 rounded-xl text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                    🔒 피드 수정/삭제는 관리자 탭에서 비밀번호 인증 후 가능합니다.
                  </div>
                  <button 
                    onClick={() => setSelectedHistory(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition"
                  >
                    닫기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 수정 및 삭제 내역 감사 로그 패널 */}
      <div className="border-t border-slate-900 pt-6 mt-8">
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-outfit">
            🛡️ 실시간 수정 및 삭제 내역 (수정내역)
          </h4>
          <div className="space-y-2">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-[11px] text-slate-300 font-mono flex items-start gap-2 border-b border-slate-900/60 pb-2 last:border-0 last:pb-0">
                  <span className={`shrink-0 font-bold px-1.5 py-0.2 rounded text-[9px] ${log.actionType === 'DELETE' ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-orange/10 text-brand-orange'}`}>
                    {log.actionType}
                  </span>
                  <span className="flex-1 text-slate-300">{log.details}</span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} {new Date(log.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-1">최근 수정 및 삭제 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
