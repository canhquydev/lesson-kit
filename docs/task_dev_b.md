# 📌 Task Assignment — Dev B

> **Dự án**: Lesson Kit Generator Backend
> **Sprint**: 7 ngày (08/09 – 14/09)
> **Vai trò**: Phase 1 Components + AI Service

---

## Bạn phụ trách gì?

Xây dựng **OpenAI service dùng chung** cho cả team, và triển khai **3 component Phase 1** (chạy song song, không phụ thuộc nhau):

```
📦 Modules của bạn:
├── ai/                      → OpenAI wrapper, retry, JSON parse
├── vocabularies/            → 8-15 từ vựng chuyên ngành
├── classroom-expressions/   → 8 nhóm mẫu câu trên lớp
├── activities/              → 2-3 hoạt động tương tác
└── common/validators/       → Framework validate output AI
```

---

## Task list

### ① OpenAI Service (Ngày 1 – sáng Ngày 2)
- Wrapper gọi OpenAI Chat Completions API
- Dùng `response_format: { type: "json_object" }` để luôn nhận JSON
- Retry tối đa 3 lần (network timeout, 429 rate limit, JSON lỗi)
- Config từ `.env`: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE`

### ② Validation Framework (Ngày 2)
- Hàm `validateAndRetry()`: generate → validate → fail thì regenerate kèm lỗi → tối đa 3 lần
- Define interface `ComponentGenerator<T>` — tất cả 6 component services sẽ implement interface này:

```typescript
interface ComponentGenerator<T> {
  generate(context: GenerationContext): Promise<T[]>;
  validate(data: any[]): ValidationResult;
  getPrompt(context: GenerationContext): string;
  findByKitId(kitId: string): Promise<T[]>;
  deleteByKitId(kitId: string): Promise<void>;
  saveBulk(kitId: string, items: T[]): Promise<T[]>;
}
```

### ③ vocabularies Module (Ngày 2-3)
- Schema theo DB docs (11 trường: word, phonetic, meaning_vi, part_of_speech, example_sentence...)
- Prompt: sinh 8-15 từ, nghĩa theo ngữ cảnh môn học, ví dụ lấy từ nội dung bài
- Validation: đủ 8-15 từ, có IPA, required fields đầy đủ

### ④ classroom-expressions Module (Ngày 3-4)
- Schema 9 trường, category thuộc 8 nhóm (opening → closing)
- Prompt: điều chỉnh theo `support_level` (A1, A2, B1, B2, C1, C2)
- Validation: 3-5 câu/nhóm, có thể bỏ nhóm không phù hợp

### ⑤ activities Module (Ngày 4-5)
- Schema 13 trường
- Prompt: chọn từ 10 loại hoạt động, ràng buộc theo duration + grade
- Validation: 2-3 hoạt động, tổng duration hợp lý

### ⑥ Unit tests cho tất cả modules trên

---

## Timeline

| Ngày | Công việc |
|:---:|---|
| **1** | OpenAI service wrapper + retry logic |
| **2** | Validation framework + bắt đầu vocabularies |
| **3** | Hoàn thành vocabularies + bắt đầu expressions |
| **4** | Hoàn thành expressions + bắt đầu activities |
| **5** | Hoàn thành activities + unit tests |
| **6-7** | Merge + integration test + fix bugs (cả team) |

---

## Quy tắc Git

- **Branch của bạn**: `dev/phase1-ai`
- **Chỉ code trong folder modules của bạn** (ai, vocabularies, classroom-expressions, activities) + `common/validators/`
- **Không sửa** file của người khác
- **Merge order**: Dev A merge trước → bạn merge sau → Dev C merge cuối

---

## Tài liệu cần đọc

- File **Database Schema** trong `docs/` → xem chi tiết fields cho 3 collections: vocabularies, classroom_expressions, activities
- File **Báo cáo thiết kế kỹ thuật** → mục a, b, c (Phase 1) để hiểu input/output/tiêu chí chất lượng
