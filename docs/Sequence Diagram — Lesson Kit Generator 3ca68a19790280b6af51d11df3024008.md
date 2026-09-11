# Sequence Diagram — Lesson Kit Generator

## 1. Sơ đồ phụ thuộc component

```mermaid
flowchart TD
    LC["Lesson Context"]

    LC --> VOC["Vocabulary<br/>(Phase 1)"]
    LC --> EXP["Classroom Expressions<br/>(Phase 1)"]
    LC --> ACT["Activities<br/>(Phase 1)"]

    VOC --> SCR["Teaching Script<br/>(Phase 2)"]
    EXP --> SCR
    ACT --> SCR
    LC --> SCR

    SCR --> QA["Student Questions<br/>(Phase 3)"]
    ACT --> QA
    LC --> QA

    ACT --> ASS["Assessment<br/>(Phase 3)"]
    LC --> ASS
    SCR --> ASS

```

**Bảng ảnh hưởng khi regenerate:**

| Regenerate | Downstream bị ảnh hưởng | Cần mark stale |
| --- | --- | --- |
| `vocabulary` | `script` → `questions`, `assessment` | script, questions, assessment |
| `expressions` | `script` → `questions`, `assessment` | script, questions, assessment |
| `activities` | `script` → `questions`, `assessment` | script, questions, assessment |
| `script` | `questions`, `assessment` | questions, assessment |
| `questions` | *(leaf node)* | — |
| `assessment` | *(leaf node)* | — |

## **2. Lesson Kit — State Diagram**

```mermaid
stateDiagram-v2
    [*] --> generating : POST /generate<br/>(202 Accepted)

    state generating {
        [*] --> phase1
        phase1 --> phase2 : Save vocab + expressions + activities
        phase2 --> phase3 : Save script
        phase3 --> [*] : Save questions + assessment
    }

    generating --> completed : Tất cả phase OK
    generating --> failed : Phase fail sau 3 retry

    failed --> generating : POST /retry<br/>(từ bước lỗi hoặc từ đầu)
    failed --> deleted : DELETE

    completed --> completed : POST /regenerate/:component<br/>(mark stale downstream)
    completed --> deleted : DELETE

    deleted --> [*]
```

## 3. Main Flow — Tạo Lesson Kit

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB
    participant AI as AI Service

    User->>FE: Chọn Môn học → Lớp → Bài học/Chủ đề<br/>Chọn Thời lượng + Cấp độ tiếng Anh (A1–C2)

    FE->>BE: POST /api/lesson-kit/generate
    Note right of FE: Request:<br/>{subject, grade, lesson_topic,<br/>duration, support_level}

    BE->>DB: Load Lesson Context
    DB-->>BE: Lesson Context
    Note over BE: Context = subject, grade, lesson,<br/>content, kiến thức, mục tiêu, YCCĐ,<br/>duration, support_level

    Note over BE,AI: PHASE 1 — Generate Independent Components
    par Vocabulary
        BE-)AI: Submit Vocabulary generation(context)
        AI-->>BE: vocabulary_json (async)
        Note right of BE: Validate output
    and Classroom Expressions
        BE-)AI: Submit Expressions generation(context)
        AI-->>BE: expressions_json (async)
        Note right of BE: Validate output
    and Activities
        BE-)AI: Submit Activities generation(context, duration, support_level)
        AI-->>BE: activities_json (async)
        Note right of BE: Validate output
    end
    alt Phase 1 fail
                BE->>DB: Update status = "failed",<br/>failed_step = "phase1_[component]"
                Note over BE: Dừng pipeline
            else Phase 1 OK
                BE->>DB: Save vocabulary + expressions + activities
                BE->>DB: Update current_step = "phase2"

                Note over BE,AI: PHASE 2 — Teaching Script (cần Phase 1)
                BE->>AI: Generate Script<br/>(context + vocab + expr + activities)
                AI-->>BE: script_json
                Note right of BE: Validate output

                alt Phase 2 fail
                    BE->>DB: Update status = "failed",<br/>failed_step = "phase2_script"
                    Note over BE: Dừng pipeline.<br/>Phase 1 vẫn còn trong DB.
                else Phase 2 OK
                    BE->>DB: Save teaching_script
                    BE->>DB: Update current_step = "phase3"

                    %% === PHASE 3 ===
                    Note over BE,AI: PHASE 3 — 2 component song song
                    par Student Questions
                        BE->>AI: Generate Questions<br/>(context + script + activities)
                        AI-->>BE: questions_json
                        Note right of BE: Validate output
                    and Assessment
                        BE->>AI: Generate Assessment<br/>(context + script + activities)
                        AI-->>BE: assessment_json
                        Note right of BE: Validate output
                    end

                    alt Phase 3 fail
                        BE->>DB: Update status = "failed",<br/>failed_step = "phase3_[component]"
                        Note over BE: Dừng pipeline.<br/>Phase 1 + 2 vẫn còn trong DB.
                    else Phase 3 OK
                        BE->>DB: Save questions + assessment
                        BE->>DB: Update status = "completed"
                    end
                end
            end

    BE->>DB: Save Lesson Kit + components
    DB-->>BE: Saved
    BE-->>FE: 201 Created / generation completed
    FE-->>User: Hiển thị Lesson Kit
```

### 3.1 Validate output

```mermaid
sequenceDiagram
    autonumber

    participant BE as Backend
    participant AI as AI Service

    Note over BE,AI: Output Validation & Feedback

    BE->>BE: Receive AI output

    loop Max 3 validation attempts
        BE->>BE: Validate JSON Schema

        alt Validation Passed
            BE->>AI: Send valid output
            AI-->>BE: Evaluation result + feedback
        else Validation Failed
            alt Attempts < 3
                BE->>AI: Regenerate output + validation errors
                AI-->>BE: New generated output
            else Max attempts reached
                BE-->>BE: Return validation error
            end
        end
    end
```

Evaluation result + feedback được lưu để làm dữ liệu huấn luyện, cải thiện AI

## 3.2 Frontend Async Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB
    participant BG as Background Job

    %% === BƯỚC 1: Submit & nhận 202 ngay ===
    User->>FE: Nhấn "Tạo Lesson Kit"
    FE->>BE: POST /api/lesson-kit/generate
    Note right of FE: {subject, grade, lesson_topic,<br/>duration, support_level}

    BE->>DB: Create Lesson Kit<br/>status = "generating", current_step = "phase1"
    DB-->>BE: lesson_kit_id

    BE-->>FE: 202 Accepted<br/>{lesson_kit_id, status: "generating"}
    FE-->>User: Hiển thị màn hình tiến độ<br/>"Đang tạo Lesson Kit..."

    %% === BƯỚC 2: Backend xử lý background ===
    BE-)BG: Dispatch generation job(lesson_kit_id)

    Note over BG: Phase 1: Vocabulary + Expressions + Activities
    BG->>DB: Update current_step = "phase1_vocabulary"
    BG->>DB: Update current_step = "phase1_expressions"
    BG->>DB: Update current_step = "phase1_activities"

    Note over BG: Phase 2: Teaching Script
    BG->>DB: Update current_step = "phase2_script"

    Note over BG: Phase 3: Questions + Assessment
    BG->>DB: Update current_step = "phase3_questions"
    BG->>DB: Update current_step = "phase3_assessment"

    %% === BƯỚC 3: Frontend polling ===
    loop Polling mỗi 3–5 giây
        FE->>BE: GET /api/lesson-kit/{id}/status
        BE->>DB: Query status + current_step
        DB-->>BE: {status, current_step, progress_percent}
        BE-->>FE: {status, current_step, progress_percent}

        alt status == "generating"
            FE-->>User: Cập nhật progress bar<br/>"Phase 1: Đang tạo từ vựng... (30%)"
        else status == "completed"
            FE->>BE: GET /api/lesson-kit/{id}
            BE-->>FE: Full Lesson Kit + 6 components
            FE-->>User: Hiển thị Lesson Kit hoàn chỉnh
        else status == "failed"
            FE-->>User: Hiển thị lỗi + nút "Thử lại"
        end
    end
```

### 3.3 Xử lý khi User mất mạng / F5 / đóng tab

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB
    participant BG as Background Job

    Note over User,BG: User đang chờ generate → F5 hoặc mất mạng

    User->>FE: F5 / Mở lại trang
    FE->>BE: GET /api/lesson-kit (danh sách)
    BE->>DB: Query lesson kits
    DB-->>BE: [{..., status: "generating", lesson_kit_id}]
    BE-->>FE: Danh sách có kit đang generating

    FE-->>User: Hiện lesson kit kèm tag: "generating"

    alt User nhấn "Nhấn vào xem lesson kit có tag generating"
        User->>FE: Nhấn vào xem lesson kit có tag generating
        FE->>BE: GET /api/lesson-kit/{id}/status
        BE-->>FE: {status: "generating", current_step, progress}
        FE-->>User: Quay lại màn hình tiến độ<br/>Tiếp tục polling
    end

    BG->>DB: Update status = "completed"

    Note over FE: Phát hiện completed
    FE->>BE: GET /api/lesson-kit/{id}/status
    BE-->>FE: {status: "completed"}
    FE->>BE: GET /api/lesson-kit/{id}
    BE-->>FE: Full Lesson Kit
    FE-->>User: Lesson Kit đã sẵn sàng!
```

---

## 4. Xem chi tiết Lesson Kit

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB

    User->>FE: Xem chi tiết Lesson Kit
    FE->>BE: GET /api/lesson-kit/{id}
    BE->>DB: Load Lesson Kit + Components
    DB-->>BE: Lesson Kit data
    BE-->>FE: 200 OK + Lesson Kit components
    FE-->>User: Render toàn bộ nội dung
```

---

## 5. Regenerate 1 Component

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB
    participant AI as AI Service

    User->>FE: Nhấn "Regenerate" component
    FE->>BE: POST /api/lesson-kit/{id}/regenerate/{component}

    Note right of FE: component = vocabulary | expressions |<br/>activities | script | questions | assessment

    BE->>DB: Load Lesson Context
    DB-->>BE: Lesson Context

    alt Component == Vocabulary
        BE->>AI: Generate Vocabulary(context)
        AI-->>BE: vocabulary_json
        Note right of BE: Validate output

    else Component == Classroom Expressions
        BE->>AI: Generate Expressions(context)
        AI-->>BE: expressions_json
        Note right of BE: Validate output

    else Component == Activities
        BE->>AI: Generate Activities(context, duration, support_level)
        AI-->>BE: activities_json
        Note right of BE: Validate output

    else Component == Teaching Script
        BE->>DB: Load Vocabulary + Expressions + Activities
        DB-->>BE: Dependencies
        BE->>AI: Generate Teaching Script(context + dependencies)
        AI-->>BE: teaching_script_json
        Note right of BE: Validate output

    else Component == Student Questions
        BE->>DB: Load Teaching Script + Activities
        DB-->>BE: Dependencies
        BE->>AI: Generate Student Questions(context + dependencies)
        AI-->>BE: questions_json
        Note right of BE: Validate output

    else Component == Assessment
        BE->>DB: Load Activities
        DB-->>BE: Activities
        BE->>AI: Generate Assessment(context + objectives + activities + duration)
        AI-->>BE: assessment_json
        Note right of BE: Validate output
    end

    BE->>DB: Save regenerated component
    DB-->>BE: Saved

    BE-->>FE: 200 OK + regenerated component
    FE-->>User: Cập nhật nội dung
```

---

## 6. Xóa Lesson Kit

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB

    User->>FE: Nhấn "Xóa" Lesson Kit
    FE->>BE: DELETE /api/lesson-kit/{id}
    BE->>DB: Delete Lesson Kit + Components
    DB-->>BE: Deleted
    BE-->>FE: 200 OK
    FE-->>User: Quay về danh sách Lesson Kit
```

---