-- 1. members 테이블 생성
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  morning_runs INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  today_completed BOOLEAN DEFAULT FALSE,
  last_distance NUMERIC DEFAULT 0,
  last_duration NUMERIC DEFAULT 0,
  last_time TEXT DEFAULT '',
  last_run_type TEXT DEFAULT '',
  is_me BOOLEAN DEFAULT FALSE
);

-- 2. runs 테이블 생성 (러닝 인증 내역)
CREATE TABLE IF NOT EXISTS runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  distance NUMERIC NOT NULL,
  duration NUMERIC NOT NULL,
  time TEXT,
  date TEXT,
  is_morning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 개발/테스트 편의성을 위해 RLS(Row Level Security) 비활성화
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE runs DISABLE ROW LEVEL SECURITY;

-- 4. 초기 크루 명단 데이터 삽입
TRUNCATE TABLE members RESTART IDENTITY;

INSERT INTO members (name, avatar, morning_runs, total_runs, today_completed, last_distance, last_duration, last_time, last_run_type, is_me) VALUES
('복케이', '👑', 2, 3, false, 0, 0, '', '', true),
('응삼', '🏃‍♂️', 3, 5, true, 6.2, 35, '06:15', 'morning', false),
('원팔', '⚡️', 1, 2, false, 0, 0, '', '', false),
('호씨', '🐢', 0, 1, false, 0, 0, '', '', false),
('아잘', '🔥', 0, 0, false, 0, 0, '', '', false),
('제프', '⚡️', 0, 0, false, 0, 0, '', '', false),
('로키', '🐺', 0, 0, false, 0, 0, '', '', false);

-- 5. 초기 인증 히스토리 데이터 삽입
TRUNCATE TABLE runs RESTART IDENTITY;

INSERT INTO runs (name, avatar, distance, duration, time, date, is_morning) VALUES
('응삼', '🏃‍♂️', 6.2, 35, '06:15', '6월 1일 (월)', true),
('복케이', '👑', 5.5, 32, '07:45', '5월 31일 (일)', true),
('원팔', '⚡️', 4.8, 31, '20:10', '5월 30일 (토)', false),
('복케이', '👑', 6.0, 38, '19:30', '5월 30일 (토)', false);

-- 6. 수정/삭제 감사 로그 테이블 생성
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action_type TEXT NOT NULL,
  editor_name TEXT NOT NULL,
  runner_name TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

