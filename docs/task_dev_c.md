# 📌 Task Assignment — Dev C

> **Dự án**: Lesson Kit Generator Backend
> **Sprint**: 7 ngày (08/09 – 14/09)
> **Vai trò**: Phase 2-3 Components + Pipeline Orchestration

---

## Bạn phụ trách gì?

Triển khai **3 component Phase 2-3** và viết **logic điều phối toàn bộ pipeline** sinh Lesson Kit (Phase 1 → 2 → 3):

```
📦 Modules của bạn:
├── teaching-scripts/     → Kịch bản giảng song ngữ (Phase 2)
├── student-questions/    → Dự đoán câu hỏi HS (Phase 3)
├── assessments/          → Đánh giá cuối giờ (Phase 3)
└── generation/           → Pipeline orchestration + Regenerate
```

---

## Task list

### ① Schemas + Prompts + DTOs (Ngày 1-2)

> ⚠️ Ngày 1-2 chưa có code Phase 1 từ Dev B, nên **tập trung viết schemas, DTOs, prompt templates trước**.

- Schema `teaching_scripts` (12 trường: teacher_speech_en, teacher_speech_vi, teacher_action...)
- Schema `student_questions` (8 trường: question_vi, question_en, suggested_answer...)
- Schema `assessments` (9 trường: question_type, options[], correct_answer...)
- Prompt templates cho cả 3 module

### ② teaching-scripts Service (Ngày 2-3)
- **Component phức tạp nhất** — phải tích hợp kết quả Phase 1 (vocab + expressions + activities)
- Prompt ràng buộc: *"BẮT BUỘC đưa tất cả hoạt động Phase 1 vào script, giữ đúng tên và đúng thời lượng"*
- Validation: tổng duration = lesson duration, activities Phase 1 phải xuất hiện trong script
- Implement interface `ComponentGenerator<TeachingScript>` (do Dev B define)

### ③ student-questions Service (Ngày 3-4)
- Input: context + teaching script + activities
- Sinh 5-8 câu hỏi HS có thể hỏi + gợi ý trả lời song ngữ
- Validation: song ngữ đầy đủ (VN + EN + answer EN + answer VN)

### ④ assessments Service (Ngày 3-4)
- Input: context + script + activities
- Sinh 3-5 câu đánh giá cuối giờ (MC, True/False, Matching, Short answer)
- Validation: đúng format theo `question_type`, options valid cho MC/TF

### ⑤ Pipeline Orchestration (Ngày 5)
- Lắng nghe event `lesson-kit.generate` từ Dev A (EventEmitter)
- Chạy pipeline async:

```typescript
async generateLessonKit(lessonKitId: string) {
  // Phase 1: chạy song song
  const [vocab, expressions, activities] = await Promise.all([
    this.vocabularyService.generate(context),
    this.expressionService.generate(context),
    this.activityService.generate(context),
  ]);

  // Phase 2: cần kết quả Phase 1
  const script = await this.scriptService.generate(context, { vocab, expressions, activities });

  // Phase 3: chạy song song
  await Promise.all([
    this.questionService.generate(context, script, activities),
    this.assessmentService.generate(context, script, activities),
  ]);
}
```

- Cập nhật `current_step` sau mỗi bước (gọi `lessonKitService.updateCurrentStep()`)
- Nếu lỗi: đánh dấu `status: failed` + ghi `current_step` bị lỗi

### ⑥ Regenerate Logic (Ngày 5)
- Khi user regenerate 1 component → sinh lại component đó + **mark stale** các component phụ thuộc:

| Regenerate | Mark stale |
|---|---|
| vocabulary / expressions / activities | script, questions, assessment |
| script | questions, assessment |
| questions / assessment | không ảnh hưởng |

### ⑦ Unit tests cho tất cả modules trên

---

## Timeline

| Ngày | Công việc |
|:---:|---|
| **1** | Viết schemas + DTOs + prompt templates (3 module) |
| **2** | Hoàn thành schemas, bắt đầu teaching-scripts service |
| **3** | Hoàn thành teaching-scripts + bắt đầu student-questions |
| **4** | Hoàn thành student-questions + assessments |
| **5** | Pipeline orchestration + Event listener + Regenerate + tests |
| **6-7** | Merge + integration test + fix bugs (cả team) |

---

## Quy tắc Git

- **Branch của bạn**: `dev/phase2-3-pipeline`
- **Chỉ code trong folder modules của bạn** (teaching-scripts, student-questions, assessments, generation)
- **Không sửa** file của người khác
- **Merge order**: Dev A merge trước → Dev B merge → **bạn merge cuối cùng**

---

## Lưu ý quan trọng

- Service của bạn phải **implement interface `ComponentGenerator<T>`** do Dev B define (hỏi Dev B lấy interface ngày 2)
- Pipeline sẽ **gọi services của Dev B** (vocabulary, expressions, activities) — thống nhất method signatures ngày 1
- Dùng `this.eventEmitter.on('lesson-kit.generate', ...)` để bắt event từ Dev A

---

## Tài liệu cần đọc

- File **Database Schema** trong `docs/` → xem chi tiết fields cho 3 collections: teaching_scripts, student_questions, assessments
- File **Báo cáo thiết kế kỹ thuật** → mục d, e, f (Phase 2-3) để hiểu input/output/tiêu chí chất lượng
- File **Sequence Diagram** → flow pipeline, regenerate, stale marking
