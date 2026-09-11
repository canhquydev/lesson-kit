# 📌 Task Assignment — Dev A

> **Dự án**: Lesson Kit Generator Backend
> **Sprint**: 7 ngày (08/09 – 14/09)
> **Vai trò**: Infrastructure + Core Data

---

## Bạn phụ trách gì?

Dựng **nền tảng project**, tạo **common module** dùng chung, và triển khai **2 module dữ liệu gốc** + toàn bộ **API endpoints**:

```
📦 Modules của bạn:
├── common/              → Error handling, DTOs, Enums, Pipes, Interfaces
├── config/              → API subjects, options
├── lesson-contents/     → Dữ liệu bài học gốc
└── lesson-kits/         → CRUD Lesson Kit, Status, Delete cascade
```

---

## Task list

### ① Project Setup (Ngày 1 sáng)
- Init NestJS project, cấu hình TypeScript strict
- Kết nối MongoDB (Mongoose)
- File `.env`:
  ```
  MONGODB_URI=
  OPENAI_API_KEY=
  OPENAI_MODEL=gpt-4o
  OPENAI_MAX_TOKENS=4096
  OPENAI_TEMPERATURE=0.7
  PORT=3000
  ```
- Cấu hình CORS, Global Pipes, Global Exception Filter

### ② Common Module (Ngày 1 chiều)
- Base Response DTO:
  ```typescript
  { success: boolean, data: any, message: string, error?: any }
  ```
- Global Exception Filter (catch tất cả lỗi, trả format chuẩn)
- Custom Validation Pipe (dùng `class-validator`)
- Enums dùng chung:
  ```typescript
  enum LessonKitStatus { DRAFT, GENERATING, COMPLETED, FAILED }
  enum SupportLevel { A1 = 'A1', A2 = 'A2', B1 = 'B1', B2 = 'B2', C1 = 'C1', C2 = 'C2' }
  enum ComponentType { VOCABULARY, EXPRESSIONS, ACTIVITIES, SCRIPT, QUESTIONS, ASSESSMENT }
  ```
- Interface `GenerationContext` (Dev B + C sẽ dùng):
  ```typescript
  interface GenerationContext {
    lessonContent: LessonContent;
    lessonKit: LessonKit;
    subject: string;
    grade: string;
    title: string;
    content: string;
    duration: number;       // 35 | 40 | 45
    supportLevel: string;   // A1 | A2 | B1 | B2 | C1 | C2
  }
  ```

### ③ Config APIs (Ngày 1 chiều)
- `GET /api/config/subjects` → `[{ code: "VAT_LI", name: "Vật lí" }, ...]`
- `GET /api/config/options` → `{ durations: [35, 40, 45], support_levels: [...] }`

### ④ lesson-contents Module (Ngày 2)
- Schema: `lesson_contents` (8 trường: _id, grade, lesson, subject, title, content, timestamps)
- Service: `findBySubjectAndGrade(subject, grade)`, `findById(id)`
- Controller: `GET /api/lessons?subject=&grade=`

### ⑤ lesson-kits Module (Ngày 3-5)
- Schema: `lesson_kits` (14 trường, indexes trên `status`, `lesson_content_id`)
- DTOs: `CreateLessonKitDto` (validate input), `LessonKitResponseDto`
- Service:
  - `create(dto)` — tạo record status=`generating`, **emit event** `lesson-kit.generate` để Dev C bắt
  - `findAll()` — danh sách kit
  - `findById(id)` — chi tiết + populate 6 components
  - `updateStatus(id, status)` — Dev C sẽ gọi
  - `updateCurrentStep(id, step)` — Dev C sẽ gọi
  - `getStatus(id)` → `{ status, current_step, generation_time_ms }`
  - `delete(id)` — xóa kit + **cascade xóa** records trong 6 collections con
- Controller (7 endpoints):
  - `POST /api/lesson-kit/generate` — validate → create → emit event
  - `GET /api/lesson-kit` — danh sách
  - `GET /api/lesson-kit/:id` — chi tiết + 6 components
  - `GET /api/lesson-kit/:id/status` — trạng thái (FE polling mỗi 3-5s)
  - `DELETE /api/lesson-kit/:id` — xóa
  - `POST /api/lesson-kit/:id/regenerate/:component` — routing đến `regenerateService` của Dev C

### ⑥ Unit tests cho tất cả modules trên

---

## Bạn cần define cho team (Ngày 1)

Những thứ Dev B và Dev C phụ thuộc vào bạn:

| Interface / Enum | Ai dùng |
|---|---|
| `GenerationContext` | Dev B + Dev C |
| `LessonKitStatus` enum | Dev C (pipeline cập nhật status) |
| `ComponentType` enum | Dev C (regenerate routing) |
| `LessonKitService.updateStatus()` | Dev C gọi |
| `LessonKitService.updateCurrentStep()` | Dev C gọi |
| Event `lesson-kit.generate` | Dev C listen |

> ⚠️ **Quan trọng**: Define các interface/enum này xong trong ngày 1 và push lên branch để Dev B, C có thể import.

---

## Timeline

| Ngày | Công việc |
|:---:|---|
| **1** | Project setup + Common module + Config APIs + **define interfaces cho team** |
| **2** | lesson-contents module hoàn chỉnh |
| **3** | lesson-kits schema + CRUD endpoints |
| **4** | Status API + Delete cascade |
| **5** | Unit tests + hỗ trợ integration |
| **6-7** | Merge + integration test + fix bugs (cả team) |

---

## Quy tắc Git

- **Branch của bạn**: `dev/infrastructure`
- **Bạn sở hữu chính `src/common/`** (trừ `common/validators/` là của Dev B)
- **Bạn merge đầu tiên** vào `main` → sau đó Dev B merge → Dev C merge cuối
- **`app.module.ts`**: Bạn tạo, khi merge Dev B/C sẽ tự thêm module imports

---

## Tài liệu cần đọc

- File **Database Schema** trong `docs/` → xem chi tiết fields cho 2 collections: lesson_contents, lesson_kits
- File **Báo cáo thiết kế kỹ thuật** → mục 1.3 (danh sách API) và mục 3 (xử lý lỗi)
- File **Sequence Diagram** → mục 3.2 (Frontend Async Flow) để hiểu polling flow
