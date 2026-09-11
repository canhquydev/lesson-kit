# LessonKit AI EdTech SaaS

An AI-driven platform creating bilingual lesson kits (English & Vietnamese) for high school STEM teachers.

---

## 📁 Repository Structure

```text
lesson-kit/
├── backend/            # NestJS API, MongoDB, OpenAI / AI pipelines
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/           # React 19 + Vite + Tailwind CSS v4 UI
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/               # Technical documentation, schemas, and diagrams
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
npm run start:dev
```
* Server runs at: `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend
pnpm install    # or npm install
npm run dev
```
* Web interface runs at: `http://localhost:8443` (or configured port)
