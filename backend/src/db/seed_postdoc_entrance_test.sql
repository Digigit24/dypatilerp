-- ============================================================
-- POSTDOC Course — Entrance Examination seed
-- Question bank: Section A (100) + Section B (100) + Section C (70) = 270 questions
-- NOTE: Source document for Section C is missing Q41-Q70 (numbering jumps 40 -> 71).
-- Students will be served 100 random questions (25/50/25) — handled in application code.
-- Run manually, e.g.:  psql "$DATABASE_URL" -f seed_postdoc_entrance_test.sql
-- ============================================================

BEGIN;

-- Guard: the POSTDOC course must exist. Adjust the pattern below if your course
-- uses a different name/code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM courses
    WHERE code ILIKE '%postdoc%' OR name ILIKE '%post%doc%'
  ) THEN
    RAISE EXCEPTION 'POSTDOC course not found in courses table — update the course lookup in this file';
  END IF;
END $$;

-- Test
INSERT INTO tests (id, course_id, title, description, type, duration_minutes, total_marks, passing_marks, instructions, status, created_at, updated_at)
VALUES (
  '48d0eca9-831a-4761-af47-f7a9e0251135',
  (SELECT id FROM courses WHERE code ILIKE '%postdoc%' OR name ILIKE '%post%doc%' ORDER BY created_at LIMIT 1),
  'POSTDOC Entrance Examination',
  'Entrance examination for the POSTDOC course. Question bank of 270 questions across 3 sections; each candidate receives 100 randomly selected questions (Section A: 25, Section B: 50, Section C: 25).',
  'entrance',
  90,
  100,
  NULL,  -- set a passing mark here if required
  'Exam Instructions to Candidates

1. This exam consists of a Total of 100 questions.
2. This exam consists of three sections:
   - Section A: English Assessment Test (25 Questions)
   - Section B: Research Aptitude Test (50 Questions)
   - Section C: Logical Reasoning Test (25 Questions)
3. The total duration to complete the exam is 1.5 hours (90 Minutes).
4. Each question is followed by four options. Choose the correct option.
5. There is only one correct answer for each question.
6. For each correct answer, you will receive 1 mark.
7. There is no negative marking for wrong answers.
8. Exam must be completed once started.',
  'draft',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sections
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('212a0413-ef12-431f-9785-0f402385b45f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'Section A – English Assessment Test', 'Tests English language proficiency, grammar, and vocabulary. (Bank: 100 questions, 25 served per candidate)', 0, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('778c4f5b-0632-406f-a955-abbe415cf50e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'Section B – Research Aptitude Test', 'Tests understanding of research methods, design, and analysis. (Bank: 100 questions, 50 served per candidate)', 1, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'Section C – Logical Reasoning Test', 'Tests pattern recognition, analogies, and logical inference. (Bank: 70 questions, 25 served per candidate)', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- Section A – English Assessment Test (100 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b9d434a2-b3d3-4e6b-9525-38c0c707432e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a noun?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dc7d3bc6-3fa9-4a27-86a7-1f4508ce7795', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is correct?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "He can sings well."}, {"key": "B", "text": "He can sing well."}, {"key": "C", "text": "He can sing good."}, {"key": "D", "text": "He can sang well."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2b541623-a89f-4b0d-9584-a9eebf969739', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct form of the verb: "She _____ to school every day."', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('02ab4f3a-dd65-4f08-b400-c7f18f38b66e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the past tense of "eat"?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "Ate"}, {"key": "B", "text": "Eaten"}, {"key": "C", "text": "Eating"}, {"key": "D", "text": "Eats"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('55ed2fa7-f6a4-4c11-b56d-8eb7274ab9a0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses a correct preposition?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "She is on the table."}, {"key": "B", "text": "She is at the table."}, {"key": "C", "text": "She is in the table."}, {"key": "D", "text": "She is by the table."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0d6ea343-deb0-4346-84a7-4084efd652ed', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct article: "____ apple a day keeps the doctor away."', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "An"}, {"key": "C", "text": "The"}, {"key": "D", "text": "No article"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('42e10f19-a5b5-431e-88fc-fbc93260eaf3', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an adjective?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quick"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Running"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6e866b8c-6cc4-4068-be17-df9487cf6434', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is the correct plural form?', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "Mouses"}, {"key": "B", "text": "Mice"}, {"key": "C", "text": "Mices"}, {"key": "D", "text": "Mouse"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f547821a-428e-4275-8bdd-b717411184fe', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the sentence?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "They don''t plays football."}, {"key": "B", "text": "They don''t play football."}, {"key": "C", "text": "They don''t playing football."}, {"key": "D", "text": "They don''t played football."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('967766a3-a600-401e-b618-fcf0629b5cad', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the future tense?', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "I eat breakfast at 8 am."}, {"key": "B", "text": "I will eat breakfast at 8 am."}, {"key": "C", "text": "I am eating breakfast at 8 am."}, {"key": "D", "text": "I ate breakfast at 8 am."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0232d289-6c97-4079-8b94-6316f867c18f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following words is an adverb?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Happy"}, {"key": "D", "text": "Red"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('33fb246d-0ee2-476a-bbce-2f20202b24cd', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct conjunction?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "And"}, {"key": "B", "text": "Slowly"}, {"key": "C", "text": "Walk"}, {"key": "D", "text": "Carefully"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('72c3c44f-1ef8-49ab-8e67-6e8a7bf96e04', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct form: "I _____ to the store yesterday."', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Went"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d261a63e-b30f-41d1-a251-f5c6b5b85f15', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the sentence?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "She can speaks English."}, {"key": "B", "text": "She can speak English."}, {"key": "C", "text": "She can speaking English."}, {"key": "D", "text": "She can spoken English."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3d5742ac-4b58-4997-9ff1-778c8d6b7667', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is an example of indirect speech?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "He says, \"I am going to the market.\""}, {"key": "B", "text": "He says he is going to the market."}, {"key": "C", "text": "He is going to the market."}, {"key": "D", "text": "He said, \"I am going to the market.\""}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('175d8154-d706-4871-941f-5adbbfa31794', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a pronoun?', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "I"}, {"key": "C", "text": "Talk"}, {"key": "D", "text": "House"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d467d337-8dce-4f6f-b466-c85066e07c5a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is written in the passive voice?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "He eats an apple."}, {"key": "B", "text": "An apple is eaten by him."}, {"key": "C", "text": "He is eating an apple."}, {"key": "D", "text": "He will eat an apple."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('40b55286-69b1-4b59-8870-68951f5cf212', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an antonym of "happy"?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Joyful"}, {"key": "B", "text": "Sad"}, {"key": "C", "text": "Excited"}, {"key": "D", "text": "Cheerful"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('53aa9615-9bf0-4bb3-8d79-3246820d112d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct sentence:', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "I don''t have no money."}, {"key": "B", "text": "I don''t have any money."}, {"key": "C", "text": "I don''t has any money."}, {"key": "D", "text": "I no have money."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('743d1b0e-6c37-4a74-b643-ba89d0f9f23c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains a possessive noun?', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "The dog runs fast."}, {"key": "B", "text": "The dog''s bone is on the floor."}, {"key": "C", "text": "The dogs run fast."}, {"key": "D", "text": "I like dogs."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5943c2a4-e4b5-4965-8397-63be9809c31f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "there" correctly?', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Their going to the park."}, {"key": "B", "text": "There is a book on the table."}, {"key": "C", "text": "I will go their soon."}, {"key": "D", "text": "I don''t like there attitude."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e9ccff33-5426-41f6-9d5f-06c0432e9bd6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a compound sentence?', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "She sings beautifully."}, {"key": "B", "text": "He likes apples, but she likes oranges."}, {"key": "C", "text": "They are students."}, {"key": "D", "text": "I am tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e4b6b9c6-16c3-4b61-b58b-96b53f850a19', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct question form?', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "She is going where?"}, {"key": "B", "text": "Where is she going?"}, {"key": "C", "text": "She where is going?"}, {"key": "D", "text": "Going where she is?"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('207a130f-c3cd-495a-9521-a92eb8c76686', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is a correct sentence in past perfect tense?', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "She had finished her work."}, {"key": "B", "text": "She finished her work."}, {"key": "C", "text": "She finishes her work."}, {"key": "D", "text": "She is finishing her work."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2f5b428b-4643-4b50-b68b-35aba780a52c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following words is a verb?', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "Dog"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Run"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c41f1de4-a563-42d5-b51f-8f8019c2db1d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the subject in the sentence: "The cat sleeps on the mat"?', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "Cat"}, {"key": "B", "text": "Sleeps"}, {"key": "C", "text": "Mat"}, {"key": "D", "text": "On"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('632263f9-e803-423c-b82d-89a020bbe376', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the object in the sentence: "She writes a letter"?', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "She"}, {"key": "B", "text": "Writes"}, {"key": "C", "text": "Letter"}, {"key": "D", "text": "A"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c0541dd1-c277-4ba6-a533-78981527fc2d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct sentence:', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "He can to swim."}, {"key": "B", "text": "He can swimming."}, {"key": "C", "text": "He can swim."}, {"key": "D", "text": "He swim can."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('75af4a2f-e7b0-4d7e-8fcb-dc3c8a31209d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct form of the verb "to be"?', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "I am going to the store."}, {"key": "B", "text": "I are going to the store."}, {"key": "C", "text": "I be going to the store."}, {"key": "D", "text": "I going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a612f073-202b-4bb8-a4e8-34f9a218ef74', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the superlative form of "big"?', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Bigger"}, {"key": "B", "text": "Biggest"}, {"key": "C", "text": "More big"}, {"key": "D", "text": "Biggestest"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('eea267bb-4752-406d-9926-b53e407b6fdb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a sentence with a modal verb?', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "She likes ice cream."}, {"key": "B", "text": "I can swim."}, {"key": "C", "text": "He eats vegetables."}, {"key": "D", "text": "They are reading."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('97d729cc-c8d8-4854-aa0a-273d797c2717', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the present continuous tense?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "I am writing a letter."}, {"key": "B", "text": "I wrote a letter."}, {"key": "C", "text": "I will write a letter."}, {"key": "D", "text": "I write a letter."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('35263722-8c3c-4c4f-be36-33a51da33b16', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "easy"?', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "Hard"}, {"key": "B", "text": "Difficult"}, {"key": "C", "text": "Simple"}, {"key": "D", "text": "Comfortable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('68822f6f-f841-4dad-acc4-d3f2379f7ee0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What type of word is "happiness"?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "Verb"}, {"key": "B", "text": "Noun"}, {"key": "C", "text": "Adjective"}, {"key": "D", "text": "Pronoun"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b3570202-7993-4be3-8643-bcfe3682250b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "light"?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "Bright"}, {"key": "B", "text": "Heavy"}, {"key": "C", "text": "Soft"}, {"key": "D", "text": "Strong"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4aea97f1-67b1-4936-afe0-32f9405d0977', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past progressive tense?', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "She was running yesterday."}, {"key": "B", "text": "She runs yesterday."}, {"key": "C", "text": "She is running yesterday."}, {"key": "D", "text": "She ran yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('493ffcb2-2766-40a4-ac10-d76f393957bd', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a declarative sentence?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "Are you coming?"}, {"key": "B", "text": "Please sit down."}, {"key": "C", "text": "She is reading."}, {"key": "D", "text": "What is your name?"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4fcd1b9f-a96d-4252-abb4-30d308b5021a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct conditional form?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "If I was you, I would help."}, {"key": "B", "text": "If I am you, I would help."}, {"key": "C", "text": "If I were you, I would help."}, {"key": "D", "text": "If I was you, I will help."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b86d5ca1-f3c4-455c-887b-39c0279a6482', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences uses an interrogative pronoun?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "Who is coming to the party?"}, {"key": "B", "text": "She is coming to the party."}, {"key": "C", "text": "This is coming to the party."}, {"key": "D", "text": "I am coming to the party."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('85979afb-77d1-4030-af91-62667e8777be', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a conjunction?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "Running"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Ball"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3dcdd27c-c25c-41cd-9ecf-2a3ab2b04ff3', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the present perfect tense?', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "He has finished his homework."}, {"key": "B", "text": "He finishes his homework."}, {"key": "C", "text": "He is finishing his homework."}, {"key": "D", "text": "He finished his homework."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('55c69f3e-1e04-46af-b87a-1dc39794dff7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct sentence?', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "I have visited to the park."}, {"key": "B", "text": "I have visited the park."}, {"key": "C", "text": "I visited have the park."}, {"key": "D", "text": "I visited to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fc512bd8-9758-4904-9bef-6b755ab17557', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in passive voice?', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "The teacher teaches the students."}, {"key": "B", "text": "The students are taught by the teacher."}, {"key": "C", "text": "The teacher is teaching the students."}, {"key": "D", "text": "The teacher teaches."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9fd621c3-ec6b-446a-b86a-5b1407936f7a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a complex sentence?', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "She is going to the store, and he is going to the park."}, {"key": "B", "text": "He went to the store."}, {"key": "C", "text": "After I finish my homework, I will go to the store."}, {"key": "D", "text": "I am tired."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e5178529-c704-418c-8c85-bc0e751d934c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the plural form of "child"?', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "Childs"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childrens"}, {"key": "D", "text": "Childes"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9f689835-937e-4829-811a-03fb789e99af', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "whose" correctly?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "Whose book is this?"}, {"key": "B", "text": "Whose are you going?"}, {"key": "C", "text": "Whose your favorite color?"}, {"key": "D", "text": "Whose did you go to?"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b47f47cd-1b49-4147-badc-9a112a0ee576', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences contains an adjective?', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "She runs quickly."}, {"key": "B", "text": "She is very happy."}, {"key": "C", "text": "She runs every day."}, {"key": "D", "text": "She is going home."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fac8e3e5-304c-4a99-9543-24daa863ee33', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "hard"?', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "Soft"}, {"key": "B", "text": "Tough"}, {"key": "C", "text": "Heavy"}, {"key": "D", "text": "Strong"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3de4b0c7-212a-4eae-9334-107e27ada4f8', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct comparative form of "good".', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "Better"}, {"key": "B", "text": "Gooder"}, {"key": "C", "text": "Best"}, {"key": "D", "text": "Weller"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c1619a74-9ab1-4a1a-a3ab-1e795f65fd71', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct possessive form of "Tom"?', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "Toms''"}, {"key": "B", "text": "Tom''s"}, {"key": "C", "text": "Tomes"}, {"key": "D", "text": "Tom"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('486fb5bf-f45c-49a3-8729-122d31264d7f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past continuous tense?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "He was playing soccer."}, {"key": "B", "text": "He plays soccer."}, {"key": "C", "text": "He played soccer."}, {"key": "D", "text": "He is playing soccer."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f46bc9f5-4ecc-46b1-8bbe-9bc8cf21cc8b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an adverb of manner?', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "Always"}, {"key": "B", "text": "Carefully"}, {"key": "C", "text": "Tomorrow"}, {"key": "D", "text": "Here"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bf07d866-8b77-4d92-b87c-9a20834eb0c4', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is a command?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "Do you like the movie?"}, {"key": "B", "text": "She likes the movie."}, {"key": "C", "text": "Please take your seat."}, {"key": "D", "text": "I like the movie."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('493eff2b-3051-4a93-bf42-fa8216b79739', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the synonym of "beautiful"?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "Ugly"}, {"key": "B", "text": "Pretty"}, {"key": "C", "text": "Strong"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('01048c08-4b48-41b6-9646-9c21f01ca62a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is a question?', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "Where are you?"}, {"key": "C", "text": "I am tired."}, {"key": "D", "text": "I like to read books."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('573b5589-a806-4678-ae80-f47448c6edfc', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a preposition?', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Under"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Run"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('48dd85de-71a1-4489-b5a9-66be3c25fd80', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "to" as part of the infinitive form?', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "I like to read books."}, {"key": "B", "text": "I am going to read books."}, {"key": "C", "text": "He likes reading books."}, {"key": "D", "text": "She is reading a book."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7b650f90-2667-4e83-b823-2e323aa70013', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a simple sentence?', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "I like coffee and I like tea."}, {"key": "B", "text": "He went to the store because he needed milk."}, {"key": "C", "text": "She reads books every day."}, {"key": "D", "text": "Although she was tired, she went to the gym."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('67d1a61a-4215-42bd-b260-6b4f148339d6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an interjection?', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Oh!"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cdb8d190-2c44-47a2-ba26-da5648ee7b1f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is the correct plural form of "fox"?', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "Foxes"}, {"key": "B", "text": "Foxs"}, {"key": "C", "text": "Foxes''"}, {"key": "D", "text": "Foxs''"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('09690e0c-bf32-41d4-bf3c-fd7dfb2efae6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the verb "to go" in the past tense?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Went"}, {"key": "D", "text": "Going"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('562c84c2-a771-497c-9df0-8929f3e35f3e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the future continuous tense?', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "I will be studying tomorrow."}, {"key": "B", "text": "I study every day."}, {"key": "C", "text": "I will study tomorrow."}, {"key": "D", "text": "I studied yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8320cd71-5f43-4d33-831f-9676f3f6acb8', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains a subordinating conjunction?', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "I am tired because I worked all day."}, {"key": "B", "text": "I went to the park, and I saw a dog."}, {"key": "C", "text": "I like coffee, but I prefer tea."}, {"key": "D", "text": "I ran quickly."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9efdc662-eff2-42b2-94e3-9f57b4f5835b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a possessive pronoun?', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "Yours"}, {"key": "B", "text": "You"}, {"key": "C", "text": "He"}, {"key": "D", "text": "She"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c7fb774d-3172-4358-92fb-092c3ee83b92', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences uses a comparative adjective?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "She is the fastest runner."}, {"key": "B", "text": "She is running faster than me."}, {"key": "C", "text": "She is a fast runner."}, {"key": "D", "text": "She runs fast."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a1b67fa8-9117-43c2-ac83-bc77f5fe5aac', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is an example of direct speech?', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "He said he was tired."}, {"key": "B", "text": "He said, \"I am tired.\""}, {"key": "C", "text": "He is tired, he said."}, {"key": "D", "text": "He said that he was tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1c58e4f1-0578-470c-9d2c-087660438647', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the correct verb tense?', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "She had gone to the store."}, {"key": "B", "text": "She gone to the store."}, {"key": "C", "text": "She have gone to the store."}, {"key": "D", "text": "She going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e5f4a2ae-63e7-47d5-a07c-3c8938b66fbb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym for "intelligent"?', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "Smart"}, {"key": "B", "text": "Strong"}, {"key": "C", "text": "Angry"}, {"key": "D", "text": "Tired"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('140baff7-704c-4ff2-858e-06e91203d15c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "then" correctly?', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "First I will study, then I will go to bed."}, {"key": "B", "text": "Then I will study first, then I will go to bed."}, {"key": "C", "text": "I will then bed go."}, {"key": "D", "text": "I will study then."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('49c15873-f02b-41ac-bfa0-63440af58b5f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the past perfect tense?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "I had finished my homework before dinner."}, {"key": "B", "text": "I finished my homework before dinner."}, {"key": "C", "text": "I will finish my homework before dinner."}, {"key": "D", "text": "I am finishing my homework before dinner."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5dbff649-5afd-4db1-a702-288d9a26dd65', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a demonstrative pronoun?', 'mcq', 1, 70, TRUE, '{"options": [{"key": "A", "text": "This"}, {"key": "B", "text": "She"}, {"key": "C", "text": "You"}, {"key": "D", "text": "He"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5fedb6e9-5a4f-4b9c-871c-a3e61ca096f2', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct conditional form?', 'mcq', 1, 71, TRUE, '{"options": [{"key": "A", "text": "If I was rich, I would travel the world."}, {"key": "B", "text": "If I am rich, I will travel the world."}, {"key": "C", "text": "If I were rich, I would travel the world."}, {"key": "D", "text": "If I were rich, I will travel the world."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b7e49c16-ad84-45f7-bcdd-011c7e96e504', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "who" correctly?', 'mcq', 1, 72, TRUE, '{"options": [{"key": "A", "text": "Who are you coming with?"}, {"key": "B", "text": "Who is going to the store?"}, {"key": "C", "text": "I know who she is."}, {"key": "D", "text": "All of the above"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('935cf56b-e3ec-4e93-bba0-85121500389b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a compound-complex sentence?', 'mcq', 1, 73, TRUE, '{"options": [{"key": "A", "text": "I went to the store, and I bought some milk."}, {"key": "B", "text": "After I finished my homework, I went to bed, and I slept well."}, {"key": "C", "text": "She likes to read books."}, {"key": "D", "text": "I like pizza, but I don’t like pasta."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('242009ae-87cf-42ab-81a1-f400552e2b8c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a conjunction?', 'mcq', 1, 74, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Car"}, {"key": "D", "text": "Dog"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('77ed854e-8d0f-4510-a91b-f028f03ce6e0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the past simple tense?', 'mcq', 1, 75, TRUE, '{"options": [{"key": "A", "text": "He is eating lunch."}, {"key": "B", "text": "He ate lunch."}, {"key": "C", "text": "He was eating lunch."}, {"key": "D", "text": "He will eat lunch."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('134ea02b-5715-4048-ab64-47c23fac4f2f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a negative sentence?', 'mcq', 1, 76, TRUE, '{"options": [{"key": "A", "text": "She can swim."}, {"key": "B", "text": "She cannot swim."}, {"key": "C", "text": "She swims."}, {"key": "D", "text": "She is swimming."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('08d01319-6f00-4d82-8c06-e90be81868b0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "they''re" correctly?', 'mcq', 1, 77, TRUE, '{"options": [{"key": "A", "text": "Theyre going to the store."}, {"key": "B", "text": "They''re going to the store."}, {"key": "C", "text": "There going to the store."}, {"key": "D", "text": "Their going to the store."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('96adb256-9957-4f17-9321-181d2417002d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym of "angry"?', 'mcq', 1, 78, TRUE, '{"options": [{"key": "A", "text": "Happy"}, {"key": "B", "text": "Mad"}, {"key": "C", "text": "Sad"}, {"key": "D", "text": "Excited"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2a523d54-05cf-4565-9520-ba2bf737606f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the past tense of "write"?', 'mcq', 1, 79, TRUE, '{"options": [{"key": "A", "text": "Wrote"}, {"key": "B", "text": "Written"}, {"key": "C", "text": "Write"}, {"key": "D", "text": "Writing"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b813b608-841f-49a7-a39c-2566b2023c21', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct order?', 'mcq', 1, 80, TRUE, '{"options": [{"key": "A", "text": "She loves playing the piano."}, {"key": "B", "text": "She loves the playing piano."}, {"key": "C", "text": "Loves she playing the piano."}, {"key": "D", "text": "Playing the piano loves she."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('93cb3384-ebcc-49fd-832e-252f7a92470b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is an example of a preposition of place?', 'mcq', 1, 81, TRUE, '{"options": [{"key": "A", "text": "After"}, {"key": "B", "text": "On"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Before"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8a08eda1-aab3-49d4-89fe-0db37a09c61a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is written in the active voice?', 'mcq', 1, 82, TRUE, '{"options": [{"key": "A", "text": "The book was read by her."}, {"key": "B", "text": "The book is being read by her."}, {"key": "C", "text": "She read the book."}, {"key": "D", "text": "The book will be read by her."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8d1d7114-f2a2-4355-abb5-ac74223ecc09', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a compound sentence?', 'mcq', 1, 83, TRUE, '{"options": [{"key": "A", "text": "I want to go to the store, but I don’t have enough money."}, {"key": "B", "text": "I like pizza."}, {"key": "C", "text": "Although I am tired, I went to the gym."}, {"key": "D", "text": "She sings well."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b5234bf8-9896-4291-8a75-e6fca0a7c05f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains an adjective clause?', 'mcq', 1, 84, TRUE, '{"options": [{"key": "A", "text": "The girl who sings is my sister."}, {"key": "B", "text": "The girl sings."}, {"key": "C", "text": "She is my sister."}, {"key": "D", "text": "The girl sings beautifully."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8f3aa453-da0f-4ae9-9548-5c3e6dddea4a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences uses an object pronoun?', 'mcq', 1, 85, TRUE, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "I gave him the book."}, {"key": "C", "text": "She likes reading."}, {"key": "D", "text": "I like her."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('45a1ca76-862e-4421-9148-43fedaf435db', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is the correct plural form of "city"?', 'mcq', 1, 86, TRUE, '{"options": [{"key": "A", "text": "Citie"}, {"key": "B", "text": "Cities"}, {"key": "C", "text": "Citys"}, {"key": "D", "text": "Citis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('78ee611a-eef9-4e79-ba09-cee6d1e25a0d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the possessive form of "cat"?', 'mcq', 1, 87, TRUE, '{"options": [{"key": "A", "text": "Cats''"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Cat''s"}, {"key": "D", "text": "Cats"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c33a245e-91cf-4900-a9b0-85fff5aa3d5f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences is correct?', 'mcq', 1, 88, TRUE, '{"options": [{"key": "A", "text": "He can singing well."}, {"key": "B", "text": "He sings well."}, {"key": "C", "text": "He singing well."}, {"key": "D", "text": "He can sing well."}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('99d2a034-c898-4ff5-bd13-891981cbe470', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is a noun?', 'mcq', 1, 89, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Jump"}, {"key": "C", "text": "Happiness"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('643d1bb5-4208-4873-820a-bee922db26f6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past perfect continuous tense?', 'mcq', 1, 90, TRUE, '{"options": [{"key": "A", "text": "I had been waiting for an hour."}, {"key": "B", "text": "I was waiting for an hour."}, {"key": "C", "text": "I waited for an hour."}, {"key": "D", "text": "I have been waiting for an hour."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4752f134-16ef-469a-85e9-b559b017e4e6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the present continuous tense?', 'mcq', 1, 91, TRUE, '{"options": [{"key": "A", "text": "I am eating lunch."}, {"key": "B", "text": "I eat lunch every day."}, {"key": "C", "text": "I will eat lunch tomorrow."}, {"key": "D", "text": "I ate lunch yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('70373864-d3da-4b2d-8b04-644ce92bbd8c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is an adjective?', 'mcq', 1, 92, TRUE, '{"options": [{"key": "A", "text": "Happily"}, {"key": "B", "text": "Happiness"}, {"key": "C", "text": "Bright"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b258a2ba-cda1-4555-a957-321c2fb4b2a5', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is the correct contraction for "they are"?', 'mcq', 1, 93, TRUE, '{"options": [{"key": "A", "text": "Theyre"}, {"key": "B", "text": "They''re"}, {"key": "C", "text": "Theys"}, {"key": "D", "text": "They"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6e290b7f-4994-4664-b8dd-03f708721967', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym of "start"?', 'mcq', 1, 94, TRUE, '{"options": [{"key": "A", "text": "Begin"}, {"key": "B", "text": "End"}, {"key": "C", "text": "Finish"}, {"key": "D", "text": "Stop"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('abe08683-77b2-4b20-9b59-d5893d54005c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "your" correctly?', 'mcq', 1, 95, TRUE, '{"options": [{"key": "A", "text": "Your my friend."}, {"key": "B", "text": "Your going to the store."}, {"key": "C", "text": "Is this your book?"}, {"key": "D", "text": "Youre my friend."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c8f1f7eb-ff3e-48ed-814f-9df203b3bbbe', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an antonym of "hot"?', 'mcq', 1, 96, TRUE, '{"options": [{"key": "A", "text": "Warm"}, {"key": "B", "text": "Cold"}, {"key": "C", "text": "Boiling"}, {"key": "D", "text": "Spicy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2d2f5b39-988b-47c5-8cf9-f24e5e209dac', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct past tense form?', 'mcq', 1, 97, TRUE, '{"options": [{"key": "A", "text": "He runs to school."}, {"key": "B", "text": "He run to school."}, {"key": "C", "text": "He ran to school."}, {"key": "D", "text": "He running to school."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e474ee3a-8acc-49a4-b7d5-32a1fd80cd94', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the proper plural form of "child"?', 'mcq', 1, 98, TRUE, '{"options": [{"key": "A", "text": "Childrens"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childs"}, {"key": "D", "text": "Childern"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('69427d53-e992-4f26-978b-358858736feb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences is a negative statement?', 'mcq', 1, 99, TRUE, '{"options": [{"key": "A", "text": "I am going to the park."}, {"key": "B", "text": "I amnot going to the park."}, {"key": "C", "text": "I go to the park."}, {"key": "D", "text": "I will go to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Section B – Research Aptitude Test (100 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('411d77fe-409a-4d93-8180-0dd669c10597', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the first step in the research process?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "Literature review"}, {"key": "B", "text": "Data collection"}, {"key": "C", "text": "Defining the research problem"}, {"key": "D", "text": "Hypothesis formulation"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6464f704-6847-4be6-b3c4-718eb270c515', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a type of primary data collection method?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "Textbooks"}, {"key": "B", "text": "Surveys"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Published articles"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9507d5d4-3cbd-4994-b99e-2921262cb720', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Sampling'' refer to in research?', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "Collecting data from all subjects"}, {"key": "B", "text": "The technique used to select a sample"}, {"key": "C", "text": "Collecting data from secondary sources"}, {"key": "D", "text": "Analyzing the entire population"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('da6bbf24-174e-4c6d-886b-5f5fccdfc5e0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which sampling technique involves dividing a population into subgroups and selecting a sample from each subgroup?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Cluster sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('637a0bbe-8d8d-4948-a31a-7ae95b140ec5', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research design focuses on establishing causal relationships between variables?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "Descriptive research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('255900be-23a6-4615-bee5-d85ee5b2f75e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Variable'' refers to:', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "A fixed characteristic in a study"}, {"key": "B", "text": "An element that can vary or change"}, {"key": "C", "text": "The sample used in research"}, {"key": "D", "text": "The research methodology"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('28c1bd6f-c994-496f-b745-e8aa76d9da49', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Reliability'' in the context of research?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "The accuracy of the data"}, {"key": "B", "text": "The consistency of the measurement"}, {"key": "C", "text": "The depth of the study"}, {"key": "D", "text": "The bias in the research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0b59162f-c646-4a7b-8210-dd7916fe4963', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'A hypothesis is:', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "A theory"}, {"key": "B", "text": "A question to be answered"}, {"key": "C", "text": "A tentative assumption or proposition that can be tested"}, {"key": "D", "text": "A conclusion drawn from data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6c471628-9021-4802-bdb3-1de1b2d9d3ff', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a characteristic of qualitative research?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "Numerical data analysis"}, {"key": "B", "text": "Statistical tests"}, {"key": "C", "text": "Focus on understanding meaning and experiences"}, {"key": "D", "text": "Large sample sizes"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fc7866b3-5483-46b8-801d-ac9864190706', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The method of research that involves detailed study of a single case is called:', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "Survey research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Case study research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2eb98139-bef5-4846-bf78-63866ca2504a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of a research study, which of the following is known as ''The independent variable''?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "The variable that is manipulated or changed"}, {"key": "B", "text": "The outcome of interest"}, {"key": "C", "text": "The variable that remains constant"}, {"key": "D", "text": "The group being studied"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ee071ee2-b3da-49ca-8927-fcf79f93b409', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of data analysis is used to interpret numerical data?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "Thematic analysis"}, {"key": "B", "text": "Quantitative analysis"}, {"key": "C", "text": "Content analysis"}, {"key": "D", "text": "Narrative analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('aea45d95-823b-4bbf-81a5-5947d766b77b', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of secondary data?', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "Interview transcripts"}, {"key": "B", "text": "Survey responses"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Observation records"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7aac03b5-db2a-4849-b263-d232b36af8ab', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research methodology uses unstructured data such as interviews, focus groups, and observations?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "Quantitative research"}, {"key": "B", "text": "Qualitative research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ce4940be-16e7-456f-b479-467263e4a59a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a non-probability sampling technique?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "Stratified random sampling"}, {"key": "B", "text": "Simple random sampling"}, {"key": "C", "text": "Systematic sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4ffcb38f-38de-4770-ae50-4c5500d97a45', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Literature review'' refers to:', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "A detailed analysis of your findings"}, {"key": "B", "text": "A summary of previously published research"}, {"key": "C", "text": "A list of research questions"}, {"key": "D", "text": "A summary of the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7315019a-80f3-4f85-8916-e6313bc34bc6', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does a ''Descriptive'' research design aim to do?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "Predict future trends"}, {"key": "B", "text": "Determine cause-effect relationships"}, {"key": "C", "text": "Describe characteristics of a phenomenon"}, {"key": "D", "text": "Test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('de28a874-b0c3-4b56-86c0-46bbda7dc969', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a dependent variable?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Age"}, {"key": "B", "text": "Gender"}, {"key": "C", "text": "Test scores"}, {"key": "D", "text": "Treatment conditions"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b1302731-aa04-4682-88b6-98cb21c940ed', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the ''Control group'' in an experimental design?', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "The group that receives the treatment"}, {"key": "B", "text": "The group that is not exposed to the experimental treatment"}, {"key": "C", "text": "The group with the largest sample size"}, {"key": "D", "text": "The group selected randomly"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2d79db1d-e9c5-4f0e-8782-5cf436f313b1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, ''Ethics'' refers to:', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "The methods used for data collection"}, {"key": "B", "text": "The ways in which data is analyzed"}, {"key": "C", "text": "The moral principles governing research conduct"}, {"key": "D", "text": "The number of participants in a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c1fb4d61-61e4-447e-8e54-bbcf01f52991', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT an example of a research instrument?', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Questionnaire"}, {"key": "B", "text": "Observation checklist"}, {"key": "C", "text": "Software tool for data analysis"}, {"key": "D", "text": "Theoretical framework"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('059a9f9b-7ac3-4a3c-b246-b42e868c466f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a common statistical technique for analyzing relationships between two variables?', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "Regression analysis"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "Factor analysis"}, {"key": "D", "text": "Ethnographic analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4540ed30-c6b8-4123-9f80-58f2d62f912b', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main purpose of an abstract in a research paper?', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "To summarize the entire study"}, {"key": "B", "text": "To explain the methodology in detail"}, {"key": "C", "text": "To list all the references used"}, {"key": "D", "text": "To provide a detailed discussion of findings"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d362b570-e9d1-463c-978d-c1250d02069c', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of qualitative data?', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "Test scores"}, {"key": "B", "text": "Weight measurements"}, {"key": "C", "text": "Interview responses"}, {"key": "D", "text": "Blood pressure readings"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1b4f1164-d53c-421e-951c-24a33d066485', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is considered a strength of using surveys in research?', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "They provide detailed, in-depth data"}, {"key": "B", "text": "They are cost-effective and allow data collection from large groups"}, {"key": "C", "text": "They are not influenced by researcher bias"}, {"key": "D", "text": "They do not require ethical considerations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('43d2f152-092b-4fa0-ae78-7c13b3702caf', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Validity'' refers to:', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "The error of measurement"}, {"key": "B", "text": "The accuracy of the measurement"}, {"key": "C", "text": "The ability to repeat the experiment"}, {"key": "D", "text": "The extent to which results are real"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b68ff8ce-663f-4633-bbb7-e685565feadc', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research method is based on structured observations and statistical tests?', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Quantitative research"}, {"key": "C", "text": "Ethnography"}, {"key": "D", "text": "Grounded theory"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('79ee7aea-52f1-4fa0-ba36-a236b010ac22', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Theoretical framework'' in a research study?', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "A summary of the study’s findings"}, {"key": "B", "text": "The foundation of theories on which the study is based"}, {"key": "C", "text": "The data collection tool used"}, {"key": "D", "text": "The statistical method employed"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1e86890b-bc1f-40bb-bd9a-a4ecc494829d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Inferential statistics''?', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "Mean"}, {"key": "B", "text": "Median"}, {"key": "C", "text": "Hypothesis testing"}, {"key": "D", "text": "Frequency distribution"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('63a31ffb-e30d-4bb9-81dc-a5d64f4cdf49', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research uses a longitudinal approach, collecting data over an extended period of time?', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Cross-sectional research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Action research"}, {"key": "D", "text": "Longitudinal research"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a8e6154d-3a6a-4965-9f24-df31ac65a036', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the research process, ''Data analysis'' refers to:', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "Writing the research report"}, {"key": "B", "text": "Organizing and interpreting the collected data"}, {"key": "C", "text": "Collecting data from participants"}, {"key": "D", "text": "Reviewing the literature"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6b2a88be-a4d1-47d0-8c26-aa3a7bd5cc6d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a qualitative research method?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Experiments"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Statistical analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c80a9844-aca4-4b44-9d06-69ad71c0c212', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The ''P-value'' in hypothesis testing is used to:', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "Measure the effect size"}, {"key": "B", "text": "Determine the likelihood that results are due to chance"}, {"key": "C", "text": "Estimate the sample size"}, {"key": "D", "text": "Summarize the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('84e59dd9-dfb0-4641-a4cc-63bcf8ed5079', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT an ethical consideration in research?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "Confidentiality"}, {"key": "B", "text": "Informed consent"}, {"key": "C", "text": "Manipulating data"}, {"key": "D", "text": "Protection from harm"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cbdf6a13-1b7e-4423-94df-834a2796ff23', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the role of the ''Literature Review'' in the research process?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "To describe the methodology used"}, {"key": "B", "text": "To identify gaps in existing research"}, {"key": "C", "text": "To summarize the data collected"}, {"key": "D", "text": "To discuss the results of the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ff03d5b4-b42f-4635-a514-5136c2ddc09d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Ethnography'' is:', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "The study of statistical data"}, {"key": "B", "text": "The analysis of cultural and social phenomena"}, {"key": "C", "text": "The observation of behaviors in controlled settings"}, {"key": "D", "text": "The analysis of numerical data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b31b3603-493e-45a2-bd23-9c59c904a7a4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT a characteristic of a well-defined research problem?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "It is clear and focused"}, {"key": "B", "text": "It is specific and researchable"}, {"key": "C", "text": "It is broad and vague"}, {"key": "D", "text": "It can be answered through data collection"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('665f7cc5-4402-48f2-bf2a-ba80a70d975b', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of a ''Cross-sectional'' study design?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "Data is collected at a single point in time"}, {"key": "B", "text": "Data is collected over a long period"}, {"key": "C", "text": "It manipulates variables to establish causality"}, {"key": "D", "text": "It focuses on qualitative analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3b106ef4-67bb-4800-af82-4d3f8f8ddd6e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Random sampling''?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "Selecting participants based on convenience"}, {"key": "B", "text": "Selecting participants who are easily accessible"}, {"key": "C", "text": "Selecting participants in such a way that every member has an equal chance of being chosen"}, {"key": "D", "text": "Selecting participants from specific groups"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8b4715de-4f88-4af9-bf28-e1289f4b0e60', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of an extraneous variable in an experiment?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "The manipulated variable"}, {"key": "B", "text": "The outcome of the experiment"}, {"key": "C", "text": "A variable that could influence the dependent variable but is not of interest to the researcher"}, {"key": "D", "text": "The variable that is measured in the experiment"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c14cdce6-1f3d-4605-8033-09459f113f6a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Non-experimental research''?', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Randomized controlled trial"}, {"key": "C", "text": "Experimental design"}, {"key": "D", "text": "Laboratory experiment"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('35ee6292-0a05-44b4-888c-69ee69b67bc3', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main goal of ''Action Research''?', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "To establish causal relationships"}, {"key": "B", "text": "To solve practical problems and improve practices"}, {"key": "C", "text": "To gather data from large samples"}, {"key": "D", "text": "To test theoretical models"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('10731383-86ce-4753-a3c1-d7116fe818a5', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Generalizability'' refers to:', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "The ability to replicate the study"}, {"key": "B", "text": "The degree to which the findings can apply to other settings or populations"}, {"key": "C", "text": "The exactness of measurement tools used"}, {"key": "D", "text": "The ethics of the research study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f1a793a7-a262-4018-9378-51f43eac8a87', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a method of collecting qualitative data?', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "Surveys with closed-ended questions"}, {"key": "B", "text": "Observation and interviews"}, {"key": "C", "text": "Statistical analysis"}, {"key": "D", "text": "Hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4ab7ed9e-ca12-4332-a252-847362f26583', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is true about the ''Control variable''?', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "It is the variable that is manipulated"}, {"key": "B", "text": "It is the variable that is measured"}, {"key": "C", "text": "It is held constant to prevent it from influencing the outcome"}, {"key": "D", "text": "It is the dependent variable"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('203d080a-208d-41b7-b6f9-91f327c8d362', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does a ''Descriptive statistic'' help researchers to do?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "Establish cause-and-effect relationships"}, {"key": "B", "text": "Summarize and describe the features of a dataset"}, {"key": "C", "text": "Make inferences about the population"}, {"key": "D", "text": "Conduct hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('037c434d-1634-47df-95a9-9c247f4e31c7', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a qualitative data collection method?', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "Surveys with Likert scale"}, {"key": "B", "text": "Content analysis of documents"}, {"key": "C", "text": "Statistical regression"}, {"key": "D", "text": "Randomized controlled trials"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e25ce51a-03a5-4126-a8bc-86ab7b70a4f5', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the key feature of ''Grounded Theory''?', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "Developing theory based on collected data"}, {"key": "B", "text": "Testing existing theories"}, {"key": "C", "text": "Collecting data through surveys"}, {"key": "D", "text": "Focusing on statistical analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c7a971bf-04c8-482c-9008-76527853ff51', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Operational Definition'' refers to:', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "A variable that is difficult to measure"}, {"key": "B", "text": "A clear, precise description of how variables will be measured"}, {"key": "C", "text": "A theoretical explanation of a concept"}, {"key": "D", "text": "A summary of previous research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('229ab9d5-c707-45e3-bd87-109983c64f2e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of a ''Quantitative'' research approach?', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "Open-ended questions"}, {"key": "B", "text": "Numerical data analysis"}, {"key": "C", "text": "Small sample sizes"}, {"key": "D", "text": "Subjective interpretation of data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8c655b47-a54c-4f67-99ba-350554466495', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a common method for assessing reliability?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "Content analysis"}, {"key": "B", "text": "Cronbach’s alpha"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Thematic analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('13b72c0c-c608-4f54-a670-6cf6791effa4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a ''Qualitative'' data analysis method?', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "Linear regression"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "T-test"}, {"key": "D", "text": "Correlation analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6b819a02-43b5-456f-9356-3c8c1a16236c', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of data analysis is used to identify trends and make predictions?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "Descriptive statistics"}, {"key": "B", "text": "Predictive analysis"}, {"key": "C", "text": "Grounded theory analysis"}, {"key": "D", "text": "Discriminant analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d1b0233b-f278-497e-99d0-7937307c314e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the primary goal of ''Hypothesis Testing''?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "To summarize the data"}, {"key": "B", "text": "To test the validity of a proposed relationship between variables"}, {"key": "C", "text": "To collect data"}, {"key": "D", "text": "To define variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7e89f7c8-0a94-48ab-b6ca-374f2b1599eb', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Secondary Data''?', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "Interview responses from participants"}, {"key": "B", "text": "Focus group discussions"}, {"key": "C", "text": "Data collected from existing studies and reports"}, {"key": "D", "text": "Observational data collected during a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('014d22ad-2cf1-4194-af75-cfba286a4338', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research method uses ''Random assignment'' to assign participants to different groups?', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "Case study research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Observational research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fb7029e3-b13d-4feb-bf6c-6bdd98fb68f4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is a key feature of ''Mixed Methods Research''?', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "Using only one type of data (quantitative or qualitative)"}, {"key": "B", "text": "Combining both quantitative and qualitative data collection and analysis"}, {"key": "C", "text": "Focusing solely on theory development"}, {"key": "D", "text": "Emphasizing statistical analysis exclusively"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('872036e6-ce62-486b-bd48-d29b78a6852a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Bias'' in research?', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "The objective measurement of variables"}, {"key": "B", "text": "The unintended influence on study results"}, {"key": "C", "text": "A clear, reproducible result"}, {"key": "D", "text": "The random selection of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3b35f9dd-7588-4f18-8c09-e29bfdecd5be', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, the ''Dependent Variable'' is:', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "The variable that is manipulated by the researcher"}, {"key": "B", "text": "The variable that changes in response to the independent variable"}, {"key": "C", "text": "The variable that remains constant throughout the study"}, {"key": "D", "text": "The outcome of the researcher''s actions"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3f9fb8ad-dc66-42e5-bc0a-f0ae469670d1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of ''Qualitative Research''?', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "Large sample sizes"}, {"key": "B", "text": "Numerical analysis"}, {"key": "C", "text": "Focus on individual experiences and meanings"}, {"key": "D", "text": "Use of statistical techniques for hypothesis testing"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fa146045-6cfc-4451-96b4-007125d64fd6', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Systematic sampling''?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "Selecting every nth person from a list"}, {"key": "B", "text": "Selecting participants based on their availability"}, {"key": "C", "text": "Randomly selecting participants from a population"}, {"key": "D", "text": "Selecting participants from specific subgroups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b4074bc4-c9e5-4cc2-ae52-999c9ac08b42', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the primary disadvantage of using ''Self-reported data''?', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "The data is difficult to interpret"}, {"key": "B", "text": "It is time-consuming to collect"}, {"key": "C", "text": "It may be subject to bias and inaccurate responses"}, {"key": "D", "text": "It provides too much detail"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('102c2cf3-d9d7-4283-8e74-9a2164fd12fb', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the purpose of ''Inferential statistics''?', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "To summarize the characteristics of a dataset"}, {"key": "B", "text": "To make inferences or predictions about a population based on a sample"}, {"key": "C", "text": "To describe data visually"}, {"key": "D", "text": "To explore relationships between variables in detail"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('07b8a6cd-209d-4262-ae98-faf87cbf828d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an ethical requirement in human research studies?', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "Offering participants financial incentives"}, {"key": "B", "text": "Informed consent from participants"}, {"key": "C", "text": "Using only quantitative methods"}, {"key": "D", "text": "Excluding vulnerable populations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cb124193-017e-460c-a845-51d7d590eec0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the purpose of ''Randomization'' in an experimental study?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "To reduce sample size"}, {"key": "B", "text": "To ensure that every participant has an equal chance of being assigned to any group"}, {"key": "C", "text": "To control for variables"}, {"key": "D", "text": "To increase participant participation"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9bb9eea5-0ef1-43ba-a9cf-fe41c7e809ce', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research focuses on understanding the lived experiences of individuals through detailed interviews and observations?', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "Phenomenological research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ce355b16-f203-41e8-bc5e-4395f2c1b01e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a ''Quantitative research instrument''?', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "Interview guide"}, {"key": "B", "text": "Questionnaire with Likert scale"}, {"key": "C", "text": "Observation notes"}, {"key": "D", "text": "Case study protocol"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('30162694-e336-4549-b556-109a83218632', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Participant observation'' involve in qualitative research?', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "Collecting data without any interaction with the participants"}, {"key": "B", "text": "Observing participants from a distance with no involvement"}, {"key": "C", "text": "Actively engaging with participants while observing their behavior"}, {"key": "D", "text": "Collecting numerical data from the participants"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7a06c6df-ed88-4d50-9728-34306a8e5335', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following best describes the ''Clarity'' of a research hypothesis?', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "It is general and vague"}, {"key": "B", "text": "It should be stated in clear, testable terms"}, {"key": "C", "text": "It should be untestable"}, {"key": "D", "text": "It does not need to specify the relationship between variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f86d280c-7f59-43aa-8c12-289a18398b06', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following methods is commonly used in ''Exploratory Research''?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Case studies"}, {"key": "C", "text": "Controlled experiments"}, {"key": "D", "text": "Focus groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3a790fa7-7201-4898-a221-220d7e063e79', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Purposive sampling''?', 'mcq', 1, 70, TRUE, '{"options": [{"key": "A", "text": "A non-random method of selecting participants based on specific characteristics"}, {"key": "B", "text": "A random selection of participants from a population"}, {"key": "C", "text": "Selecting participants who are easy to access"}, {"key": "D", "text": "Selecting participants based on their willingness to participate"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5ad6f0bd-a4f6-466e-97eb-22befbe019b0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main advantage of ''Random Sampling''?', 'mcq', 1, 71, TRUE, '{"options": [{"key": "A", "text": "It eliminates bias in the selection of participants"}, {"key": "B", "text": "It requires less time and effort"}, {"key": "C", "text": "It ensures all variables are controlled"}, {"key": "D", "text": "It guarantees accurate results for qualitative studies"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9b7c2841-6921-449e-adf9-8e1f726d4f86', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a type of research where the researcher manipulates the independent variable?', 'mcq', 1, 72, TRUE, '{"options": [{"key": "A", "text": "Correlational research"}, {"key": "B", "text": "Descriptive research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Observational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('df413afd-cb74-4dc1-9f74-e980b4eb2286', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Triangulation'' in research?', 'mcq', 1, 73, TRUE, '{"options": [{"key": "A", "text": "Using multiple data sources, methods, or theories to increase the validity of research findings"}, {"key": "B", "text": "The process of analyzing data with one method only"}, {"key": "C", "text": "The testing of hypotheses with experimental methods only"}, {"key": "D", "text": "The selection of a single data source for analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('815e0ef3-e609-4b5b-aca4-ec8678cc40d6', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is true about a ''Longitudinal'' study?', 'mcq', 1, 74, TRUE, '{"options": [{"key": "A", "text": "Data is collected at one point in time"}, {"key": "B", "text": "It is conducted over an extended period of time to track changes over time"}, {"key": "C", "text": "It manipulates variables to establish cause-effect relationships"}, {"key": "D", "text": "It focuses on a small group of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8452c7bc-4068-4b1e-b1bb-23993827c3d0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Reliability'' in research?', 'mcq', 1, 75, TRUE, '{"options": [{"key": "A", "text": "The accuracy of measurement"}, {"key": "B", "text": "The consistency of measurement over time"}, {"key": "C", "text": "The significance of results"}, {"key": "D", "text": "The ability to generalize results"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1018fc9c-9f2b-4fab-be87-998e1f6529e9', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT a feature of ''Descriptive Research''?', 'mcq', 1, 76, TRUE, '{"options": [{"key": "A", "text": "It focuses on describing characteristics or phenomena"}, {"key": "B", "text": "It manipulates variables to test hypotheses"}, {"key": "C", "text": "It collects data to summarize the situation"}, {"key": "D", "text": "It is often used to create baseline data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c91e2d6c-5f53-45bc-9cff-23783c4df308', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which sampling method ensures that the population is evenly represented by dividing it into distinct subgroups?', 'mcq', 1, 77, TRUE, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Snowball sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4e52165b-3fa4-4df8-900f-2d3f01e35e09', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, the ''Independent Variable'' is:', 'mcq', 1, 78, TRUE, '{"options": [{"key": "A", "text": "The variable that is measured or observed"}, {"key": "B", "text": "The variable that remains constant"}, {"key": "C", "text": "The variable that is manipulated or changed by the researcher"}, {"key": "D", "text": "The variable that is not related to the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0c306004-c47c-4ab7-b175-f8f7f8267102', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Sampling Bias'' refer to?', 'mcq', 1, 79, TRUE, '{"options": [{"key": "A", "text": "The random selection of participants"}, {"key": "B", "text": "The tendency to select participants who represent the population"}, {"key": "C", "text": "The error introduced due to non-random selection of participants"}, {"key": "D", "text": "The statistical analysis of the sample data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('50527f1a-9d56-4e34-b7cb-e3f7d4d9fe77', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Nominal'' data?', 'mcq', 1, 80, TRUE, '{"options": [{"key": "A", "text": "Height of individuals"}, {"key": "B", "text": "Types of fruits (apple, banana, orange)"}, {"key": "C", "text": "Temperatures in Celsius"}, {"key": "D", "text": "Weight of animals"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('825a7098-cbc2-4dbe-ac1b-d0bebd5f2516', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following best describes ''Secondary Research''?', 'mcq', 1, 81, TRUE, '{"options": [{"key": "A", "text": "Collecting data directly from participants"}, {"key": "B", "text": "Analyzing existing data collected by other researchers"}, {"key": "C", "text": "Conducting surveys to gather original data"}, {"key": "D", "text": "Experimenting with new data collection methods"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f55f7df6-68e0-4c64-919c-6cad5535b9ed', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the purpose of ''Theoretical Framework'' in research?', 'mcq', 1, 82, TRUE, '{"options": [{"key": "A", "text": "To define the scope of the study"}, {"key": "B", "text": "To guide data analysis and interpretation"}, {"key": "C", "text": "To test hypotheses"}, {"key": "D", "text": "To collect primary data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cb9dae45-4b03-4b41-aa0b-1d92f1d42570', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Interval'' data?', 'mcq', 1, 83, TRUE, '{"options": [{"key": "A", "text": "Number of students in a class"}, {"key": "B", "text": "Temperature in Celsius"}, {"key": "C", "text": "Eye color of individuals"}, {"key": "D", "text": "Gender of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fd2d0a12-d740-41d1-9b62-f3f739190ae9', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a ''Causal-comparative research design'', researchers try to:', 'mcq', 1, 84, TRUE, '{"options": [{"key": "A", "text": "Observe and describe behaviors"}, {"key": "B", "text": "Establish cause-and-effect relationships"}, {"key": "C", "text": "Focus on one individual case"}, {"key": "D", "text": "Compare differences in unrelated groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9a011e59-eda1-4863-9008-7b4b299b4e8a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the primary function of ''Pilot Testing'' in research?', 'mcq', 1, 85, TRUE, '{"options": [{"key": "A", "text": "To test the final data analysis"}, {"key": "B", "text": "To gather primary data"}, {"key": "C", "text": "To test the research design and instruments before the main study"}, {"key": "D", "text": "To calculate the sample size"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6adc7fd0-a3da-4ed3-a41b-66eba4e1db26', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is a ''Double-blind'' experiment?', 'mcq', 1, 86, TRUE, '{"options": [{"key": "A", "text": "An experiment where both participants and experimenters are unaware of the group assignments"}, {"key": "B", "text": "An experiment where only participants are unaware of the group assignments"}, {"key": "C", "text": "An experiment where only the researchers are unaware of the outcomes"}, {"key": "D", "text": "An experiment involving two different types of groups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3b1b8ec0-013b-4e66-9668-bc83c0374372', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Naturalistic Observation''?', 'mcq', 1, 87, TRUE, '{"options": [{"key": "A", "text": "Observing participants in a controlled lab setting"}, {"key": "B", "text": "Observing participants without their knowledge"}, {"key": "C", "text": "Observing participants in their natural environment without interference"}, {"key": "D", "text": "Manipulating the environment to test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e48b3aa7-08ad-4b5a-808a-93a7f4f3d2b4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In research, ''Confounding Variables'' are:', 'mcq', 1, 88, TRUE, '{"options": [{"key": "A", "text": "Variables that are irrelevant to the study"}, {"key": "B", "text": "Variables that are deliberately manipulated"}, {"key": "C", "text": "Variables that affect the dependent variable but are not part of the research design"}, {"key": "D", "text": "Variables that are measured during the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('13b4fe23-b0f4-439c-b883-a71af8bfc959', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research is used to investigate the relationships between variables without manipulating them?', 'mcq', 1, 89, TRUE, '{"options": [{"key": "A", "text": "Experimental research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('760a26e3-6647-40a5-bd3d-ed21facaed3e', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Ethnographic Research''?', 'mcq', 1, 90, TRUE, '{"options": [{"key": "A", "text": "Surveying a large population"}, {"key": "B", "text": "Conducting in-depth interviews with participants"}, {"key": "C", "text": "Studying cultural groups through immersion and observation"}, {"key": "D", "text": "Analyzing historical documents"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('853bb3cf-5261-4329-9f33-64164fc8700b', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Cluster Sampling'' involve?', 'mcq', 1, 91, TRUE, '{"options": [{"key": "A", "text": "Dividing the population into groups and randomly selecting from those groups"}, {"key": "B", "text": "Randomly selecting individuals from the population"}, {"key": "C", "text": "Selecting every nth participant from a list"}, {"key": "D", "text": "Selecting participants based on their specific traits"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ca8a2c46-9a3a-4e94-8654-cc9d96f50957', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a disadvantage of using ''Convenience Sampling''?', 'mcq', 1, 92, TRUE, '{"options": [{"key": "A", "text": "It is time-consuming and expensive"}, {"key": "B", "text": "It provides a high degree of randomness"}, {"key": "C", "text": "It may introduce sampling bias due to ease of selection"}, {"key": "D", "text": "It requires sophisticated data analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('edbc80ec-a042-4699-ab54-f11f49879368', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Content Analysis'' typically involve in qualitative research?', 'mcq', 1, 93, TRUE, '{"options": [{"key": "A", "text": "Analyzing statistical data from surveys"}, {"key": "B", "text": "Analyzing text, media, or documents to identify patterns or themes"}, {"key": "C", "text": "Conducting interviews and analyzing responses"}, {"key": "D", "text": "Conducting experiments to test hypotheses"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4dbdb491-39bf-4dcc-a634-eefa9a27e818', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a key advantage of ''Focus Groups'' in qualitative research?', 'mcq', 1, 94, TRUE, '{"options": [{"key": "A", "text": "Provides large-scale data"}, {"key": "B", "text": "Allows in-depth exploration of participants'' experiences and opinions"}, {"key": "C", "text": "Involves only quantitative data collection"}, {"key": "D", "text": "Is highly objective and free from bias"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f7adca63-6544-4cbf-9d87-9f9a63e4837f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Multivariate Analysis'' examine?', 'mcq', 1, 95, TRUE, '{"options": [{"key": "A", "text": "The relationship between two variables"}, {"key": "B", "text": "The relationship between more than two variables simultaneously"}, {"key": "C", "text": "The cause-and-effect relationship between variables"}, {"key": "D", "text": "The frequency distribution of a single variable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7a2e451d-754b-4c97-9740-14a1cb456b66', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Transparency'' refers to:', 'mcq', 1, 96, TRUE, '{"options": [{"key": "A", "text": "The clarity of the research hypothesis"}, {"key": "B", "text": "The openness and clarity in reporting the research process and findings"}, {"key": "C", "text": "The use of complex statistical methods"}, {"key": "D", "text": "The confidentiality of participant information"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('26de4d53-dfa4-4f95-9186-3fa7bce4cea5', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a key element in a ''Research Proposal''?', 'mcq', 1, 97, TRUE, '{"options": [{"key": "A", "text": "The collection of data"}, {"key": "B", "text": "The introduction and review of the literature"}, {"key": "C", "text": "The detailed results of the study"}, {"key": "D", "text": "The data analysis techniques used in the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fc928d55-792f-4183-8cda-36d92722779f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Internal Validity'' in research?', 'mcq', 1, 98, TRUE, '{"options": [{"key": "A", "text": "The degree to which the study results can be generalized to other settings"}, {"key": "B", "text": "The consistency of the research results over time"}, {"key": "C", "text": "The degree to which the study accurately measures the intended variables"}, {"key": "D", "text": "The ethical considerations of the research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4a5cbe08-a236-4e8e-b3c7-c8ca8ebb48a1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''External Validity'' refer to in research?', 'mcq', 1, 99, TRUE, '{"options": [{"key": "A", "text": "The consistency of the research results"}, {"key": "B", "text": "The extent to which the results can be generalized to other populations or settings"}, {"key": "C", "text": "The ethical treatment of participants"}, {"key": "D", "text": "The precision of measurement tools used"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Section C – Logical Reasoning Test (70 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7c08dfdc-1a71-4413-8075-82ad5a3c2d96', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '2, 6, 12, 20, 30, ?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7b5e46db-32c2-4cee-afab-bf31779e37ac', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '5, 10, 20, 40, ?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "60"}, {"key": "B", "text": "70"}, {"key": "C", "text": "80"}, {"key": "D", "text": "100"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c2e73945-cb77-42d3-bfe2-14ba2a428035', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '1, 4, 9, 16, 25, ?', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "36"}, {"key": "C", "text": "49"}, {"key": "D", "text": "64"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dcde7615-35ed-46b8-b318-73f3a1dfe147', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '3, 8, 15, 24, 35, ?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "46"}, {"key": "B", "text": "48"}, {"key": "C", "text": "50"}, {"key": "D", "text": "52"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c1553642-477e-4a95-bcc0-3f45cc83945d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '7, 14, 28, 56, ?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "98"}, {"key": "B", "text": "112"}, {"key": "C", "text": "120"}, {"key": "D", "text": "124"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dd297140-57b0-4c64-adc7-b9839b66792d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '11, 13, 17, 19, 23, ?', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "25"}, {"key": "B", "text": "27"}, {"key": "C", "text": "29"}, {"key": "D", "text": "31"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('697d4288-8ba9-43c5-81f5-b7dde60b631e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '2, 5, 10, 17, 26, ?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "35"}, {"key": "B", "text": "37"}, {"key": "C", "text": "39"}, {"key": "D", "text": "41"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('84668908-526f-4a6f-a880-b1f15e93aacc', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '81, 27, 9, 3, ?', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "1"}, {"key": "B", "text": "2"}, {"key": "C", "text": "4"}, {"key": "D", "text": "6"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b4b05e0d-5c29-4c0f-a07a-363c11b99872', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '4, 9, 16, 25, 36, ?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "47"}, {"key": "B", "text": "48"}, {"key": "C", "text": "49"}, {"key": "D", "text": "50"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('40f8c074-4910-434d-a249-7e9cc719547a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '1, 8, 27, 64, ?', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "81"}, {"key": "B", "text": "100"}, {"key": "C", "text": "125"}, {"key": "D", "text": "216"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('14cdc4b0-2cc9-46c6-90c6-81bfbbae2ae8', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Book : Reading :: Fork : ?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "Writing"}, {"key": "B", "text": "Eating"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Washing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('545cd2c4-3c1c-44d0-a969-a5b6ffca06c1', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Bird : Nest :: Bee : ?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "Hive"}, {"key": "B", "text": "Hole"}, {"key": "C", "text": "Tree"}, {"key": "D", "text": "Cave"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3fabd482-2ec9-41f4-a64c-153121f0de65', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Doctor : Hospital :: Teacher : ?', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "School"}, {"key": "B", "text": "Library"}, {"key": "C", "text": "Office"}, {"key": "D", "text": "Home"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('23daa07e-d50a-4b3c-98ff-d0e5cf9cd334', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Puppy : Dog :: Kitten : ?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "Tiger"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Lion"}, {"key": "D", "text": "Rabbit"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('211dbb3a-4631-41a4-9003-24b56061fe48', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Foot : Shoe :: Hand : ?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "Ring"}, {"key": "B", "text": "Watch"}, {"key": "C", "text": "Glove"}, {"key": "D", "text": "Bracelet"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3578728e-ed0d-499e-a58d-fd7e8e7e883c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Water : Thirst :: Food : ?', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "Hunger"}, {"key": "B", "text": "Taste"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Energy"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('05dbe3ab-3a1c-480c-8222-d416cc5ded43', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Pen : Ink :: Car : ?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "Petrol"}, {"key": "B", "text": "Wheel"}, {"key": "C", "text": "Driver"}, {"key": "D", "text": "Road"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e3e7d469-6611-43d5-b0e4-114efb386ae1', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Eye : See :: Ear : ?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Touch"}, {"key": "B", "text": "Hear"}, {"key": "C", "text": "Taste"}, {"key": "D", "text": "Speak"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('23e9030b-9b17-4410-84cb-55eb2b496ee3', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'King : Queen :: Man : ?', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "Girl"}, {"key": "B", "text": "Woman"}, {"key": "C", "text": "Lady"}, {"key": "D", "text": "Wife"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dbabd104-acbe-4c67-8020-280ad055be74', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Fish : Water :: Bird : ?', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "Forest"}, {"key": "B", "text": "Air"}, {"key": "C", "text": "Nest"}, {"key": "D", "text": "Tree"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('606b1408-7b0b-4661-bb43-c0a0d20a7d9a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Apple"}, {"key": "B", "text": "Mango"}, {"key": "C", "text": "Banana"}, {"key": "D", "text": "Potato"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1fbe8776-36e6-4f89-9681-2b2139f1bd1c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "Triangle"}, {"key": "B", "text": "Square"}, {"key": "C", "text": "Circle"}, {"key": "D", "text": "Pencil"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('32dbb8f0-643f-4265-8891-0ba8e2edf6cc', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "Cow"}, {"key": "B", "text": "Goat"}, {"key": "C", "text": "Sheep"}, {"key": "D", "text": "Eagle"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('25d518e3-0f7a-41ff-8975-97242b4a79bb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "January"}, {"key": "B", "text": "February"}, {"key": "C", "text": "March"}, {"key": "D", "text": "Monday"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dee06bee-33c7-4329-b022-f8d683347c21', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "Red"}, {"key": "B", "text": "Blue"}, {"key": "C", "text": "Green"}, {"key": "D", "text": "Chair"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8f8a1d08-6d68-487f-829a-41069a873184', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "Bus"}, {"key": "B", "text": "Train"}, {"key": "C", "text": "Bicycle"}, {"key": "D", "text": "Rose"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4dbdf742-81ce-4a82-ac17-19bca9d13c95', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "Gold"}, {"key": "B", "text": "Silver"}, {"key": "C", "text": "Copper"}, {"key": "D", "text": "Plastic"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3c4affa1-03e4-4d70-a70d-94ef062dc506', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "Lion"}, {"key": "B", "text": "Tiger"}, {"key": "C", "text": "Leopard"}, {"key": "D", "text": "Sparrow"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8f2815e4-5b04-4ca9-872a-1dd7a5071ea4', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "Cricket"}, {"key": "B", "text": "Football"}, {"key": "C", "text": "Hockey"}, {"key": "D", "text": "Doctor"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fbe7e564-dd57-4a6b-aa89-8b01cde4e89c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Table"}, {"key": "B", "text": "Chair"}, {"key": "C", "text": "Sofa"}, {"key": "D", "text": "Apple"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8291c7ec-1933-4c08-bd18-a6931c59bd83', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CAT = DBU, then DOG = ?', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "EPH"}, {"key": "B", "text": "EOH"}, {"key": "C", "text": "FPH"}, {"key": "D", "text": "EPG"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d9aeecd4-c11e-49a9-b12f-466ad4c251b2', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If PEN = QFO, then BOOK = ?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "CPPL"}, {"key": "B", "text": "CQQM"}, {"key": "C", "text": "CPPL"}, {"key": "D", "text": "BPPL"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dd450e3d-6f29-46c1-afad-239c1224c0bb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If ROAD = SPBE, then CAR = ?', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "DBS"}, {"key": "B", "text": "DBS"}, {"key": "C", "text": "DBS"}, {"key": "D", "text": "DBS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7818ffbb-c0ee-4c0a-afb5-95bfea50487b', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If BAT = 21320, then CAT = ?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "31320"}, {"key": "B", "text": "32320"}, {"key": "C", "text": "31310"}, {"key": "D", "text": "32310"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('733b93dd-3da4-468a-9a89-2161123d3f0e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If APPLE = BQQMF, then GRAPE = ?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "HSBQF"}, {"key": "B", "text": "HSBPF"}, {"key": "C", "text": "HSBQG"}, {"key": "D", "text": "HSBRF"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6a56a1e4-8467-432f-b38e-35e4c6c8be4e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If SUN = TVO, then MOON = ?', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "NPPO"}, {"key": "B", "text": "NPPQ"}, {"key": "C", "text": "NQPP"}, {"key": "D", "text": "OPPQ"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ddb1c0da-2ecd-4d73-bf78-f179a78b92c3', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CODE = DPEF, then DATA = ?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "EBUB"}, {"key": "B", "text": "EBVA"}, {"key": "C", "text": "ECVB"}, {"key": "D", "text": "FCVB"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3e26564b-a977-4001-a388-0a8d4d897f32', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If KING = LJOH, then QUEEN = ?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "RVFFO"}, {"key": "B", "text": "RVGFO"}, {"key": "C", "text": "RVFFP"}, {"key": "D", "text": "SVFFO"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0aedd927-e92c-48e3-a8e6-7ea9d25a9216', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If BALL = CBMM, then CALL = ?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "DBMM"}, {"key": "B", "text": "DBNN"}, {"key": "C", "text": "EBNN"}, {"key": "D", "text": "DBML"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9e922deb-aa4c-4a99-b29a-a62daed2ae01', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If MOUSE = NPVTF, then RAT = ?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "SBU"}, {"key": "B", "text": "SAT"}, {"key": "C", "text": "RBU"}, {"key": "D", "text": "TBU"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('48debc6e-0739-49a7-bc9e-885ab51608f2', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All cats are animals. Tom is a cat.', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "Tom is an animal"}, {"key": "B", "text": "Tom is a dog"}, {"key": "C", "text": "Tom is a bird"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8a146e06-bb97-44a3-a7a5-d39e92f8ec0f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All roses are flowers. Some flowers are red.', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "Some roses are red"}, {"key": "B", "text": "All roses are red"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No rose is red"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2bd2d102-fe3d-4abb-a9b1-8e6612f1db45', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All apples are fruits. All fruits are healthy.', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "All apples are healthy"}, {"key": "B", "text": "Some apples are healthy"}, {"key": "C", "text": "No apples are healthy"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6ba83275-6bd1-4dbd-b08b-1111fc79c38e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Some boys are players.', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "All boys are players"}, {"key": "B", "text": "Some players are boys"}, {"key": "C", "text": "No players are boys"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2f2cde2d-22b6-434d-8c2e-e8c29ba8be72', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All teachers are educated. Some educated people are writers.', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "All teachers are writers"}, {"key": "B", "text": "Some writers are teachers"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No teachers are writers"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a795a768-36da-4949-b912-ed798366a556', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All dogs are animals. No animal is a plant. Conclusion?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "No dog is a plant"}, {"key": "B", "text": "All plants are dogs"}, {"key": "C", "text": "Some dogs are plants"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('15248563-82c4-436c-9cf7-272a004e8c22', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All cars have wheels. A car is a vehicle. Conclusion?', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "All vehicles have wheels"}, {"key": "B", "text": "Some vehicles have wheels"}, {"key": "C", "text": "No vehicles have wheels"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('09a03437-fada-426e-bdfa-2d43a2f73626', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All pencils are stationery. All stationery are useful.', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "All pencils are useful"}, {"key": "B", "text": "Some pencils are useful"}, {"key": "C", "text": "No pencils are useful"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('11e51b7f-cc0c-4329-8025-e1103b0a3532', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Some students are athletes.', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "All athletes are students"}, {"key": "B", "text": "Some athletes are students"}, {"key": "C", "text": "No athletes are students"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('07a93d1f-6819-4b72-aa78-ff5a03a7fe48', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All books are papers. All papers are recyclable.', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "All books are recyclable"}, {"key": "B", "text": "Some books are recyclable"}, {"key": "C", "text": "No books are recyclable"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c3650464-592c-4b6f-8b16-e99cf76ca831', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next number: 3, 7, 15, 31, 63, ?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "95"}, {"key": "B", "text": "127"}, {"key": "C", "text": "128"}, {"key": "D", "text": "131"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5125a154-3b7a-460e-b546-644d0450adf8', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If TABLE is coded as UBCMF, then CHAIR is coded as:', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "DIBJS"}, {"key": "B", "text": "DIBJR"}, {"key": "C", "text": "EJCJS"}, {"key": "D", "text": "DHCJR"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('30869fec-6bc7-4ae5-9f34-673d34a33201', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which word does not belong to the group?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "Doctor"}, {"key": "B", "text": "Nurse"}, {"key": "C", "text": "Teacher"}, {"key": "D", "text": "Hospital"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('62a4582c-7719-469f-b7e1-273d240338ae', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A is taller than B. B is taller than C. Who is the shortest?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4bf907d8-8f1f-430c-9142-f3064996f617', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next letter: A, C, E, G, ?', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "H"}, {"key": "B", "text": "I"}, {"key": "C", "text": "J"}, {"key": "D", "text": "K"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8f179093-cb2a-4976-800d-3359b110108e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If SOUTH is written as HTUOS, then NORTH is written as:', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "HTRON"}, {"key": "B", "text": "NROTH"}, {"key": "C", "text": "HTRNO"}, {"key": "D", "text": "OTRHN"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7b09608b-9839-43f4-bde1-97b5888293bb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which number is missing? 4, 9, 16, 25, ?, 49', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "35"}, {"key": "C", "text": "36"}, {"key": "D", "text": "40"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('70bce23e-be82-45b7-99c6-7a112e99329a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If all pens are books and all books are bags, then all pens are:', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "Bags"}, {"key": "B", "text": "Books only"}, {"key": "C", "text": "Bags and books"}, {"key": "D", "text": "None"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c2c487ba-39f0-41d3-ba22-a39d9744afaa', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd one out:', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "8"}, {"key": "B", "text": "27"}, {"key": "C", "text": "64"}, {"key": "D", "text": "81"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8f8c263d-3213-4b45-943f-af0ea4d26348', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A clock shows 3:00. What is the angle between the hands?', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "60°"}, {"key": "B", "text": "75°"}, {"key": "C", "text": "90°"}, {"key": "D", "text": "120°"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8056be00-8a18-4e78-82ec-468f6039e184', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CAT = 24 and DOG = 26, then BAT = ?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "22"}, {"key": "B", "text": "23"}, {"key": "C", "text": "24"}, {"key": "D", "text": "25"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('56b91a96-1770-43b0-9567-46479715e17e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Pointing to a woman, Raj says, "She is the daughter of my mother''s only daughter." How is the woman related to Raj?', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "Sister"}, {"key": "B", "text": "Daughter"}, {"key": "C", "text": "Niece"}, {"key": "D", "text": "Cousin"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e6e05219-c0c2-4573-8930-eaa914251a8f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next number: 2, 6, 12, 20, 30, ?', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3a64c94b-9b32-4053-95eb-968bf595133e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which pair has the same relationship? Bird : Fly', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "Fish : Swim"}, {"key": "B", "text": "Dog : Bark"}, {"key": "C", "text": "Cow : Milk"}, {"key": "D", "text": "Cat : Pet"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ead2d3c5-46c7-46e9-95c0-2edb5bcc9eb8', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A man walks 5 km East, then 5 km North. In which direction is he from the starting point?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "North-East"}, {"key": "B", "text": "South-East"}, {"key": "C", "text": "North-West"}, {"key": "D", "text": "West"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('311cbb84-ad39-4f95-b252-8315af2363e4', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd one:', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "Monday"}, {"key": "B", "text": "Wednesday"}, {"key": "C", "text": "Friday"}, {"key": "D", "text": "January"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fed27c11-d391-408a-9d2a-c6b045790e43', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If PENCIL is coded as QFODJM, then ERASER is coded as:', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "FSBTFS"}, {"key": "B", "text": "GSBTFS"}, {"key": "C", "text": "FSCTFS"}, {"key": "D", "text": "GSBUFS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8045c365-403e-4356-832e-f7e3ad53452f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All roses are flowers. Some flowers are yellow. Which conclusion follows?', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "All roses are yellow"}, {"key": "B", "text": "Some roses are yellow"}, {"key": "C", "text": "No rose is yellow"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('403842fb-8a3e-4e68-8e47-1a59f31d6751', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Complete the series: Z, X, V, T, ?', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "R"}, {"key": "B", "text": "Q"}, {"key": "C", "text": "P"}, {"key": "D", "text": "S"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d4c8ed3f-9aaf-4141-8234-8af318369160', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Five friends A, B, C, D, and E are sitting in a row. A is to the left of B, and C is to the right of B. Who is in the middle among A, B, and C?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot determine"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verification (run after migration):
-- SELECT s.title, COUNT(q.id) FROM test_sections s
--   LEFT JOIN test_questions q ON q.section_id = s.id
--   WHERE s.test_id = '48d0eca9-831a-4761-af47-f7a9e0251135'
--   GROUP BY s.title ORDER BY s.title;
-- Expected: Section A = 100, Section B = 100, Section C = 70
