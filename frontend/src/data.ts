export type Status = "Completed" | "Generating" | "Failed";

export type LessonKit = {
  id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Biology" | "Math";
  grade: "Grade 10" | "Grade 11" | "Grade 12";
  duration: string;
  cefr: string;
  created: string;
  status: Status;
};

export const lessonKits: LessonKit[] = [
  {
    id: "1",
    title: "Lesson 4: Uniform Accelerated Motion",
    subject: "Physics",
    grade: "Grade 10",
    duration: "45 mins",
    cefr: "B1",
    created: "8 Sep 2026",
    status: "Generating",
  },
  {
    id: "2",
    title: "Newton's Laws of Motion",
    subject: "Physics",
    grade: "Grade 10",
    duration: "45 mins",
    cefr: "B1",
    created: "6 Sep 2026",
    status: "Completed",
  },
  {
    id: "3",
    title: "Balancing Chemical Equations",
    subject: "Chemistry",
    grade: "Grade 11",
    duration: "40 mins",
    cefr: "B2",
    created: "5 Sep 2026",
    status: "Completed",
  },
  {
    id: "4",
    title: "Cell Structure & Organelles",
    subject: "Biology",
    grade: "Grade 10",
    duration: "45 mins",
    cefr: "A2",
    created: "3 Sep 2026",
    status: "Completed",
  },
  {
    id: "5",
    title: "Quadratic Functions & Graphs",
    subject: "Math",
    grade: "Grade 10",
    duration: "40 mins",
    cefr: "B1",
    created: "2 Sep 2026",
    status: "Completed",
  },
  {
    id: "6",
    title: "The Periodic Table Trends",
    subject: "Chemistry",
    grade: "Grade 10",
    duration: "35 mins",
    cefr: "A2",
    created: "1 Sep 2026",
    status: "Failed",
  },
  {
    id: "7",
    title: "Photosynthesis & Cellular Respiration",
    subject: "Biology",
    grade: "Grade 11",
    duration: "45 mins",
    cefr: "B2",
    created: "29 Aug 2026",
    status: "Completed",
  },
  {
    id: "8",
    title: "Derivatives & Rates of Change",
    subject: "Math",
    grade: "Grade 12",
    duration: "45 mins",
    cefr: "C1",
    created: "27 Aug 2026",
    status: "Completed",
  },
  {
    id: "9",
    title: "Electric Fields & Potential",
    subject: "Physics",
    grade: "Grade 11",
    duration: "45 mins",
    cefr: "B2",
    created: "25 Aug 2026",
    status: "Completed",
  },
];

export const subjectTopics: Record<string, string[]> = {
  Physics: [
    "Lesson 1: Describing Motion",
    "Lesson 2: Speed and Velocity",
    "Lesson 3: Acceleration",
    "Lesson 4: Uniform Accelerated Motion",
    "Lesson 5: Free Fall",
    "Lesson 6: Newton's Laws of Motion",
  ],
  Chemistry: [
    "Lesson 1: Atomic Structure",
    "Lesson 2: The Periodic Table Trends",
    "Lesson 3: Chemical Bonding",
    "Lesson 4: Balancing Chemical Equations",
  ],
  Biology: [
    "Lesson 1: Cell Structure & Organelles",
    "Lesson 2: Cell Membrane Transport",
    "Lesson 3: Photosynthesis",
    "Lesson 4: Cellular Respiration",
  ],
  Math: [
    "Lesson 1: Linear Functions",
    "Lesson 2: Quadratic Functions & Graphs",
    "Lesson 3: Polynomials",
    "Lesson 4: Derivatives & Rates of Change",
  ],
};

export const vocabulary = [
  {
    word: "acceleration",
    ipa: "/əkˌsel.əˈreɪ.ʃən/",
    pos: "noun",
    meaning: "gia tốc — the rate of change of velocity over time",
    example: "The car's acceleration was 2 metres per second squared.",
  },
  {
    word: "velocity",
    ipa: "/vəˈlɒs.ə.ti/",
    pos: "noun",
    meaning: "vận tốc — speed in a given direction",
    example: "The object's velocity increased steadily down the ramp.",
  },
  {
    word: "displacement",
    ipa: "/dɪsˈpleɪs.mənt/",
    pos: "noun",
    meaning: "độ dịch chuyển — change in position of an object",
    example: "Calculate the total displacement after five seconds.",
  },
  {
    word: "uniform",
    ipa: "/ˈjuː.nɪ.fɔːm/",
    pos: "adjective",
    meaning: "đều, không đổi — remaining the same; constant",
    example: "In uniform motion, acceleration stays constant.",
  },
  {
    word: "to derive",
    ipa: "/dɪˈraɪv/",
    pos: "verb",
    meaning: "suy ra, rút ra — to obtain a formula from principles",
    example: "We can derive the equation from the velocity graph.",
  },
  {
    word: "magnitude",
    ipa: "/ˈmæɡ.nɪ.tʃuːd/",
    pos: "noun",
    meaning: "độ lớn — the size or amount of a quantity",
    example: "The magnitude of the force determines the acceleration.",
  },
];

export const activities = [
  {
    name: "Ramp Race Prediction",
    vi: "Dự đoán cuộc đua trên mặt phẳng nghiêng",
    duration: "10 mins",
    grouping: "Groups of 4",
    desc: "Students release a toy car down ramps of different angles and predict which reaches the bottom first, then measure acceleration.",
    descVi: "Học sinh thả xe đồ chơi trên các mặt phẳng nghiêng khác nhau, dự đoán xe nào xuống trước rồi đo gia tốc.",
    materials: ["Toy cars", "Ruler & stopwatch", "Adjustable ramp"],
  },
  {
    name: "Graph It Live",
    vi: "Vẽ đồ thị trực tiếp",
    duration: "8 mins",
    grouping: "Pairs",
    desc: "Using motion data from the race, pairs plot a velocity–time graph and interpret the slope as acceleration.",
    descVi: "Dùng dữ liệu từ cuộc đua, các cặp vẽ đồ thị vận tốc–thời gian và giải thích độ dốc chính là gia tốc.",
    materials: ["Graph paper", "Worksheet 3"],
  },
  {
    name: "Real-Life Match",
    vi: "Ghép với đời thực",
    duration: "5 mins",
    grouping: "Whole class",
    desc: "Students match everyday scenarios (elevator, braking bus) to the correct type of accelerated motion.",
    descVi: "Học sinh ghép các tình huống đời thực (thang máy, xe buýt phanh) với loại chuyển động biến đổi phù hợp.",
    materials: ["Scenario cards"],
  },
];

export const expressions = [
  {
    en: "Let's take a closer look at...",
    vi: "Chúng ta hãy cùng xem kỹ hơn về...",
    use: "Chuyển sang nội dung mới",
  },
  {
    en: "Can anyone give me an example?",
    vi: "Có bạn nào cho cô một ví dụ không?",
    use: "Khơi gợi phát biểu",
  },
  {
    en: "Work with your partner and discuss...",
    vi: "Hãy làm việc với bạn cùng cặp và thảo luận...",
    use: "Hướng dẫn hoạt động nhóm",
  },
  {
    en: "Does everyone follow so far?",
    vi: "Cả lớp theo kịp đến đây chưa?",
    use: "Kiểm tra mức độ hiểu bài",
  },
  {
    en: "Great thinking! Let's build on that.",
    vi: "Suy nghĩ rất hay! Hãy phát triển thêm ý đó.",
    use: "Khích lệ, phản hồi tích cực",
  },
];

export const studentQA = [
  {
    q: "Is acceleration the same as speeding up?",
    qVi: "Gia tốc có phải là tăng tốc không?",
    a: "Not always — acceleration means any change in velocity, so slowing down or changing direction also counts as acceleration.",
    aVi: "Không hẳn — gia tốc là bất kỳ sự thay đổi nào của vận tốc, nên chậm lại hoặc đổi hướng cũng là gia tốc.",
    level: "Common",
  },
  {
    q: "Can an object have zero velocity but still be accelerating?",
    qVi: "Vật có thể có vận tốc bằng 0 nhưng vẫn có gia tốc không?",
    a: "Yes. At the highest point of a thrown ball, velocity is zero for an instant but gravity still gives it acceleration.",
    aVi: "Có. Ở điểm cao nhất của quả bóng ném lên, vận tốc bằng 0 trong khoảnh khắc nhưng trọng lực vẫn tạo ra gia tốc.",
    level: "Tricky",
  },
  {
    q: "Why is the velocity–time graph a straight line here?",
    qVi: "Tại sao đồ thị vận tốc–thời gian ở đây lại là đường thẳng?",
    a: "Because the acceleration is constant (uniform), the velocity changes by the same amount each second, giving a straight line.",
    aVi: "Vì gia tốc không đổi (đều), vận tốc thay đổi cùng một lượng mỗi giây nên đồ thị là đường thẳng.",
    level: "Common",
  },
];

export const assessments = [
  {
    type: "Multiple Choice",
    q: "A car speeds up from 0 to 20 m/s in 4 s. What is its acceleration?",
    options: ["2 m/s²", "5 m/s²", "16 m/s²", "80 m/s²"],
    answer: 1,
    points: 1,
  },
  {
    type: "Short Answer",
    q: "Explain in one sentence why free fall is an example of uniform accelerated motion.",
    guide: "Answer should mention constant gravitational acceleration (≈ 9.8 m/s²).",
    points: 2,
  },
  {
    type: "Problem",
    q: "An object starts from rest and accelerates at 3 m/s² for 5 s. Find its final velocity and displacement.",
    guide: "v = at = 15 m/s; s = ½at² = 37.5 m.",
    points: 3,
  },
];

export const script = [
  {
    step: "Step 1",
    title: "Warm-up (5 mins) — Review & Hook",
    en: "Good morning, everyone! Yesterday we studied velocity. Today, let's discover what happens when velocity keeps changing.",
    enCue: "[Writes the formula v = v₀ + at on the board]",
    vi: "Chào cả lớp! Hôm qua chúng ta đã học về vận tốc. Hôm nay, hãy cùng khám phá điều gì xảy ra khi vận tốc thay đổi liên tục.",
    viCue: "[Học sinh trả lời bằng ví dụ thực tế: xe máy tăng tốc, thang máy...]",
  },
  {
    step: "Step 2",
    title: "Direct Instruction (20 mins) — Core Concepts",
    en: "Acceleration is the rate at which velocity changes. When it stays constant, we call it uniform accelerated motion. Look carefully at this velocity-time graph.",
    enCue: "[Points to the straight line on the v–t graph]",
    vi: "Gia tốc là tốc độ thay đổi của vận tốc. Khi nó không đổi, ta gọi là chuyển động thẳng biến đổi đều. Hãy quan sát kỹ đồ thị vận tốc – thời gian này.",
    viCue: "[Học sinh ghi chú và nêu ý nghĩa độ dốc của đồ thị]",
  },
  {
    step: "Step 3",
    title: "Interactive Activity (15 mins) — Think-Pair-Share",
    en: "Now, work in pairs. Solve problem 3 together, then share your reasoning with the class. Explain each step in English if you can.",
    enCue: "[Divides the class into pairs and distributes worksheets]",
    vi: "Bây giờ, hãy làm việc theo cặp. Cùng giải bài 3, sau đó chia sẻ cách lập luận với cả lớp. Hãy cố gắng giải thích từng bước bằng tiếng Anh.",
    viCue: "[Các cặp thảo luận và trình bày lời giải trên bảng]",
  },
];
