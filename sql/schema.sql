-- Ban KHONG can chay file nay bang tay - ung dung tu tao bang nay khi goi API lan dau.
-- File nay chi de tham khao cau truc du lieu.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cau truc cua cot "state" (JSON), do frontend tu doc/ghi:
-- {
--   "knownIds": [12, 45, 88, ...],   -- id cac tu da danh dau "Da nho" trong Flashcard
--   "lastTheme": "FOOD"              -- chu de dang chon gan nhat (hoac null = Tat ca)
-- }
