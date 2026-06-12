-- ============================================================
-- POSTDOC Course — Entrance Examination seed
-- Question bank: Section A (100) + Section B (100) + Section C (100) = 300 questions
-- Students are served 100 random questions (25/50/25) — handled in application code.
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
  'Entrance examination for the POSTDOC course. Question bank of 300 questions across 3 sections; each candidate receives 100 randomly selected questions (Section A: 25, Section B: 50, Section C: 25).',
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
VALUES ('a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'Section C – Logical Reasoning Test', 'Tests pattern recognition, analogies, and logical inference. (Bank: 100 questions, 25 served per candidate)', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- Section A – English Assessment Test (100 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('05904e9c-8e4d-4f02-999f-880d49956c9c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a noun?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('df093cc2-4f39-4d93-b10a-4d767f11a291', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is correct?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "He can sings well."}, {"key": "B", "text": "He can sing well."}, {"key": "C", "text": "He can sing good."}, {"key": "D", "text": "He can sang well."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('81f01439-faad-431c-908c-1380565c51cb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct form of the verb: "She _____ to school every day."', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('46b37de2-13c7-40e4-aa90-a371deb8efd1', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the past tense of "eat"?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "Ate"}, {"key": "B", "text": "Eaten"}, {"key": "C", "text": "Eating"}, {"key": "D", "text": "Eats"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d7da180e-55b2-48f0-9d18-26893f84939a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses a correct preposition?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "She is on the table."}, {"key": "B", "text": "She is at the table."}, {"key": "C", "text": "She is in the table."}, {"key": "D", "text": "She is by the table."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('493abeef-79ab-4499-8743-6c4430ff4068', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct article: "____ apple a day keeps the doctor away."', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "An"}, {"key": "C", "text": "The"}, {"key": "D", "text": "No article"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('020bd9db-3db1-4563-8596-3265d6a17960', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an adjective?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quick"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Running"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8a252d38-4ece-4de2-bc70-30a192d67d65', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is the correct plural form?', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "Mouses"}, {"key": "B", "text": "Mice"}, {"key": "C", "text": "Mices"}, {"key": "D", "text": "Mouse"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bd418263-7028-486d-8bf3-07f686bc32a1', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the sentence?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "They don''t plays football."}, {"key": "B", "text": "They don''t play football."}, {"key": "C", "text": "They don''t playing football."}, {"key": "D", "text": "They don''t played football."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bb43c2d9-188c-4197-acb5-6f15a2e42671', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the future tense?', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "I eat breakfast at 8 am."}, {"key": "B", "text": "I will eat breakfast at 8 am."}, {"key": "C", "text": "I am eating breakfast at 8 am."}, {"key": "D", "text": "I ate breakfast at 8 am."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6a790605-2cc0-4e61-808e-aed26d67b090', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following words is an adverb?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Happy"}, {"key": "D", "text": "Red"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2bd781c2-dec6-4815-a40f-dfd81b67f179', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct conjunction?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "And"}, {"key": "B", "text": "Slowly"}, {"key": "C", "text": "Walk"}, {"key": "D", "text": "Carefully"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c826f760-097a-4091-863f-525dc227b269', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct form: "I _____ to the store yesterday."', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Went"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('35e5924c-30b8-48ce-a7a7-1e3298b8a2e0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the sentence?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "She can speaks English."}, {"key": "B", "text": "She can speak English."}, {"key": "C", "text": "She can speaking English."}, {"key": "D", "text": "She can spoken English."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bc5d9121-5576-407f-8aae-30d1febcb5ae', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is an example of indirect speech?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "He says, \"I am going to the market.\""}, {"key": "B", "text": "He says he is going to the market."}, {"key": "C", "text": "He is going to the market."}, {"key": "D", "text": "He said, \"I am going to the market.\""}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('afb91dca-ba81-4e0e-bc32-cd538f68e0c4', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a pronoun?', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "I"}, {"key": "C", "text": "Talk"}, {"key": "D", "text": "House"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('44f90670-b288-4281-af9d-4091c678379f', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is written in the passive voice?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "He eats an apple."}, {"key": "B", "text": "An apple is eaten by him."}, {"key": "C", "text": "He is eating an apple."}, {"key": "D", "text": "He will eat an apple."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ece64c40-2ba3-4973-996d-55cb9771d4d4', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an antonym of "happy"?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Joyful"}, {"key": "B", "text": "Sad"}, {"key": "C", "text": "Excited"}, {"key": "D", "text": "Cheerful"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f312bfcf-7476-4650-87ec-e5397d60f673', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct sentence:', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "I don''t have no money."}, {"key": "B", "text": "I don''t have any money."}, {"key": "C", "text": "I don''t has any money."}, {"key": "D", "text": "I no have money."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('62da92a2-2485-4030-bdbf-57cc4ac71bec', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains a possessive noun?', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "The dog runs fast."}, {"key": "B", "text": "The dog''s bone is on the floor."}, {"key": "C", "text": "The dogs run fast."}, {"key": "D", "text": "I like dogs."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5e8a7c64-190a-4c56-9f83-f9a47d8f653e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "there" correctly?', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Their going to the park."}, {"key": "B", "text": "There is a book on the table."}, {"key": "C", "text": "I will go their soon."}, {"key": "D", "text": "I don''t like there attitude."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('53f75b9a-0572-48ef-9533-8a051d345065', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a compound sentence?', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "She sings beautifully."}, {"key": "B", "text": "He likes apples, but she likes oranges."}, {"key": "C", "text": "They are students."}, {"key": "D", "text": "I am tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d20553d8-7ce5-423a-8e12-2a26c1b3d0e7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct question form?', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "She is going where?"}, {"key": "B", "text": "Where is she going?"}, {"key": "C", "text": "She where is going?"}, {"key": "D", "text": "Going where she is?"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c9445337-4cb2-4ca0-8e81-dba759989714', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is a correct sentence in past perfect tense?', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "She had finished her work."}, {"key": "B", "text": "She finished her work."}, {"key": "C", "text": "She finishes her work."}, {"key": "D", "text": "She is finishing her work."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('881963ab-ff4b-4833-8314-3c21ef4c4999', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following words is a verb?', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "Dog"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Run"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e86ef50a-a781-4b93-a7d1-81cf9b0012c4', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the subject in the sentence: "The cat sleeps on the mat"?', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "Cat"}, {"key": "B", "text": "Sleeps"}, {"key": "C", "text": "Mat"}, {"key": "D", "text": "On"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1b4ff37e-c461-41e2-bab4-4d1145c3c8fb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the object in the sentence: "She writes a letter"?', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "She"}, {"key": "B", "text": "Writes"}, {"key": "C", "text": "Letter"}, {"key": "D", "text": "A"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a62099f2-8762-4d83-8b87-b500f899fdfa', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct sentence:', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "He can to swim."}, {"key": "B", "text": "He can swimming."}, {"key": "C", "text": "He can swim."}, {"key": "D", "text": "He swim can."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9713bb70-7ee1-40cf-bff2-4246596f7f1c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which is a correct form of the verb "to be"?', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "I am going to the store."}, {"key": "B", "text": "I are going to the store."}, {"key": "C", "text": "I be going to the store."}, {"key": "D", "text": "I going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5c636d10-e9d2-4c89-b51a-06f9097ce454', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the superlative form of "big"?', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Bigger"}, {"key": "B", "text": "Biggest"}, {"key": "C", "text": "More big"}, {"key": "D", "text": "Biggestest"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('37508535-d0ed-4f9d-9d70-946aeb82ae8e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a sentence with a modal verb?', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "She likes ice cream."}, {"key": "B", "text": "I can swim."}, {"key": "C", "text": "He eats vegetables."}, {"key": "D", "text": "They are reading."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f62c409d-28b2-427d-846d-47b334ee9074', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the present continuous tense?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "I am writing a letter."}, {"key": "B", "text": "I wrote a letter."}, {"key": "C", "text": "I will write a letter."}, {"key": "D", "text": "I write a letter."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b6f10982-3ef0-49fb-b617-08e0aa46fa5c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "easy"?', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "Hard"}, {"key": "B", "text": "Difficult"}, {"key": "C", "text": "Simple"}, {"key": "D", "text": "Comfortable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2dd94ef5-fbfa-4a90-b3d5-8d3cffb071fc', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What type of word is "happiness"?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "Verb"}, {"key": "B", "text": "Noun"}, {"key": "C", "text": "Adjective"}, {"key": "D", "text": "Pronoun"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('17fde65f-e2ac-472a-bba0-a4774415d6e3', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "light"?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "Bright"}, {"key": "B", "text": "Heavy"}, {"key": "C", "text": "Soft"}, {"key": "D", "text": "Strong"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c02e305b-9aa7-42e6-99f4-f9d76b1410b9', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past progressive tense?', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "She was running yesterday."}, {"key": "B", "text": "She runs yesterday."}, {"key": "C", "text": "She is running yesterday."}, {"key": "D", "text": "She ran yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('60db5d73-a854-490b-9892-07cb64f71d89', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a declarative sentence?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "Are you coming?"}, {"key": "B", "text": "Please sit down."}, {"key": "C", "text": "She is reading."}, {"key": "D", "text": "What is your name?"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1daa21b7-5df8-47a7-a958-ff0159e0a520', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct conditional form?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "If I was you, I would help."}, {"key": "B", "text": "If I am you, I would help."}, {"key": "C", "text": "If I were you, I would help."}, {"key": "D", "text": "If I was you, I will help."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6d117724-c0db-4cc5-a9a5-0ef3a901b185', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences uses an interrogative pronoun?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "Who is coming to the party?"}, {"key": "B", "text": "She is coming to the party."}, {"key": "C", "text": "This is coming to the party."}, {"key": "D", "text": "I am coming to the party."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a579f9c4-3321-44ce-a486-773c9efbc112', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a conjunction?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "Running"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Ball"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1705a69d-7ef1-4bd6-9885-6a9f12ff01b0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the present perfect tense?', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "He has finished his homework."}, {"key": "B", "text": "He finishes his homework."}, {"key": "C", "text": "He is finishing his homework."}, {"key": "D", "text": "He finished his homework."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1ce76ec2-98b9-4e2a-a529-881f96cae375', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct sentence?', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "I have visited to the park."}, {"key": "B", "text": "I have visited the park."}, {"key": "C", "text": "I visited have the park."}, {"key": "D", "text": "I visited to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f0e8c7dd-a9d8-4f76-8262-05cf422b2a86', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in passive voice?', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "The teacher teaches the students."}, {"key": "B", "text": "The students are taught by the teacher."}, {"key": "C", "text": "The teacher is teaching the students."}, {"key": "D", "text": "The teacher teaches."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c3e250fa-377f-4a8f-a149-2a88a76178d4', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a complex sentence?', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "She is going to the store, and he is going to the park."}, {"key": "B", "text": "He went to the store."}, {"key": "C", "text": "After I finish my homework, I will go to the store."}, {"key": "D", "text": "I am tired."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('24cd602e-5705-45fb-a1d1-84f541904752', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the plural form of "child"?', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "Childs"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childrens"}, {"key": "D", "text": "Childes"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5dd88c53-4169-424b-9ba3-ce94079e635d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "whose" correctly?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "Whose book is this?"}, {"key": "B", "text": "Whose are you going?"}, {"key": "C", "text": "Whose your favorite color?"}, {"key": "D", "text": "Whose did you go to?"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('57419207-b7f7-4b00-abf1-a36860242c57', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences contains an adjective?', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "She runs quickly."}, {"key": "B", "text": "She is very happy."}, {"key": "C", "text": "She runs every day."}, {"key": "D", "text": "She is going home."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0cbc2d3b-1945-4756-95f8-a9e98bbc8bfa', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is the opposite of "hard"?', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "Soft"}, {"key": "B", "text": "Tough"}, {"key": "C", "text": "Heavy"}, {"key": "D", "text": "Strong"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('338cbd36-e21f-46f1-9ce0-168ed91ff6c7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Choose the correct comparative form of "good".', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "Better"}, {"key": "B", "text": "Gooder"}, {"key": "C", "text": "Best"}, {"key": "D", "text": "Weller"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4ac7c731-05cd-4b22-ad0e-1897a6ba1fcc', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct possessive form of "Tom"?', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "Toms''"}, {"key": "B", "text": "Tom''s"}, {"key": "C", "text": "Tomes"}, {"key": "D", "text": "Tom"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d4715e95-d604-4bbf-b9c5-158a73f88bdd', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past continuous tense?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "He was playing soccer."}, {"key": "B", "text": "He plays soccer."}, {"key": "C", "text": "He played soccer."}, {"key": "D", "text": "He is playing soccer."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('634cedc4-39c0-4e70-abc3-e24fc0bb01f1', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an adverb of manner?', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "Always"}, {"key": "B", "text": "Carefully"}, {"key": "C", "text": "Tomorrow"}, {"key": "D", "text": "Here"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7f49c9a7-84dd-4270-bd64-98886499257c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is a command?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "Do you like the movie?"}, {"key": "B", "text": "She likes the movie."}, {"key": "C", "text": "Please take your seat."}, {"key": "D", "text": "I like the movie."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5e36082f-cd75-4107-8222-86e2d30ac8c7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the synonym of "beautiful"?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "Ugly"}, {"key": "B", "text": "Pretty"}, {"key": "C", "text": "Strong"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('eb340536-e17f-493f-a736-26130a21175a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is a question?', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "Where are you?"}, {"key": "C", "text": "I am tired."}, {"key": "D", "text": "I like to read books."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('03b95f9d-2b90-415d-a11e-dfef279b94f6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a preposition?', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Under"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Run"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f9fea6ba-ae32-4931-89d2-9badb54cb82c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "to" as part of the infinitive form?', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "I like to read books."}, {"key": "B", "text": "I am going to read books."}, {"key": "C", "text": "He likes reading books."}, {"key": "D", "text": "She is reading a book."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b8c40a6e-4af8-4737-9dfd-14068f5bd951', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a simple sentence?', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "I like coffee and I like tea."}, {"key": "B", "text": "He went to the store because he needed milk."}, {"key": "C", "text": "She reads books every day."}, {"key": "D", "text": "Although she was tired, she went to the gym."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('64a37f7f-b83c-4390-9695-3e7db26c9bdf', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an interjection?', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Oh!"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('68bc616b-af88-4ff0-891e-4501184346d6', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is the correct plural form of "fox"?', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "Foxes"}, {"key": "B", "text": "Foxs"}, {"key": "C", "text": "Foxes''"}, {"key": "D", "text": "Foxs''"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a9b4fa3c-96a3-43ea-94ed-6fa69678a690', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the correct form of the verb "to go" in the past tense?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Went"}, {"key": "D", "text": "Going"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('05e0b322-28f5-4fdd-ba6f-ccf81e30a966', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the future continuous tense?', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "I will be studying tomorrow."}, {"key": "B", "text": "I study every day."}, {"key": "C", "text": "I will study tomorrow."}, {"key": "D", "text": "I studied yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d3d9002a-b6a6-4954-884e-38e45add008e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains a subordinating conjunction?', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "I am tired because I worked all day."}, {"key": "B", "text": "I went to the park, and I saw a dog."}, {"key": "C", "text": "I like coffee, but I prefer tea."}, {"key": "D", "text": "I ran quickly."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5148db09-af3f-4729-b095-34afb39250eb', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a possessive pronoun?', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "Yours"}, {"key": "B", "text": "You"}, {"key": "C", "text": "He"}, {"key": "D", "text": "She"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3da55848-6f39-4d30-ba70-81afb47f4f8a', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences uses a comparative adjective?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "She is the fastest runner."}, {"key": "B", "text": "She is running faster than me."}, {"key": "C", "text": "She is a fast runner."}, {"key": "D", "text": "She runs fast."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('377b6871-27c1-493d-a423-fe6a6ce4ea1b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is an example of direct speech?', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "He said he was tired."}, {"key": "B", "text": "He said, \"I am tired.\""}, {"key": "C", "text": "He is tired, he said."}, {"key": "D", "text": "He said that he was tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f8b173cb-d1ab-44df-985c-f065264a1b6e', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the correct verb tense?', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "She had gone to the store."}, {"key": "B", "text": "She gone to the store."}, {"key": "C", "text": "She have gone to the store."}, {"key": "D", "text": "She going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8c97b85d-8609-4143-920c-14e737d165d0', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym for "intelligent"?', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "Smart"}, {"key": "B", "text": "Strong"}, {"key": "C", "text": "Angry"}, {"key": "D", "text": "Tired"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8ead2b73-4b02-4647-9708-0cfe279323e3', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "then" correctly?', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "First I will study, then I will go to bed."}, {"key": "B", "text": "Then I will study first, then I will go to bed."}, {"key": "C", "text": "I will then bed go."}, {"key": "D", "text": "I will study then."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('78ee7050-1d52-4e6e-87b0-58faabb524e7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the past perfect tense?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "I had finished my homework before dinner."}, {"key": "B", "text": "I finished my homework before dinner."}, {"key": "C", "text": "I will finish my homework before dinner."}, {"key": "D", "text": "I am finishing my homework before dinner."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0684ce5d-b336-4e67-9aa1-d16b114ba8aa', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is a demonstrative pronoun?', 'mcq', 1, 70, TRUE, '{"options": [{"key": "A", "text": "This"}, {"key": "B", "text": "She"}, {"key": "C", "text": "You"}, {"key": "D", "text": "He"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dffe3759-1507-4be7-8848-10b8757796bf', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct conditional form?', 'mcq', 1, 71, TRUE, '{"options": [{"key": "A", "text": "If I was rich, I would travel the world."}, {"key": "B", "text": "If I am rich, I will travel the world."}, {"key": "C", "text": "If I were rich, I would travel the world."}, {"key": "D", "text": "If I were rich, I will travel the world."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b710fd25-b319-40d2-af80-7a282c2f5905', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses the word "who" correctly?', 'mcq', 1, 72, TRUE, '{"options": [{"key": "A", "text": "Who are you coming with?"}, {"key": "B", "text": "Who is going to the store?"}, {"key": "C", "text": "I know who she is."}, {"key": "D", "text": "All of the above"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e11a6448-6cb8-4ae4-bd36-958307804bf3', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a compound-complex sentence?', 'mcq', 1, 73, TRUE, '{"options": [{"key": "A", "text": "I went to the store, and I bought some milk."}, {"key": "B", "text": "After I finished my homework, I went to bed, and I slept well."}, {"key": "C", "text": "She likes to read books."}, {"key": "D", "text": "I like pizza, but I don’t like pasta."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6dc76f4e-f04e-4a66-bb0f-0f4288eb3265', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a conjunction?', 'mcq', 1, 74, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Car"}, {"key": "D", "text": "Dog"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3f7ffb5c-c256-44c8-b996-c4056da68558', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences is in the past simple tense?', 'mcq', 1, 75, TRUE, '{"options": [{"key": "A", "text": "He is eating lunch."}, {"key": "B", "text": "He ate lunch."}, {"key": "C", "text": "He was eating lunch."}, {"key": "D", "text": "He will eat lunch."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fdee7563-c406-4f8c-9723-bab281063637', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a negative sentence?', 'mcq', 1, 76, TRUE, '{"options": [{"key": "A", "text": "She can swim."}, {"key": "B", "text": "She cannot swim."}, {"key": "C", "text": "She swims."}, {"key": "D", "text": "She is swimming."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f024efb5-ab8f-4e44-b8a5-9c342840a2c9', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "they''re" correctly?', 'mcq', 1, 77, TRUE, '{"options": [{"key": "A", "text": "Theyre going to the store."}, {"key": "B", "text": "They''re going to the store."}, {"key": "C", "text": "There going to the store."}, {"key": "D", "text": "Their going to the store."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('40ebea84-6673-4333-81d9-e9f36f2fae1c', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym of "angry"?', 'mcq', 1, 78, TRUE, '{"options": [{"key": "A", "text": "Happy"}, {"key": "B", "text": "Mad"}, {"key": "C", "text": "Sad"}, {"key": "D", "text": "Excited"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4d15f5f2-161c-4db6-9e39-c4c8de087c71', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the past tense of "write"?', 'mcq', 1, 79, TRUE, '{"options": [{"key": "A", "text": "Wrote"}, {"key": "B", "text": "Written"}, {"key": "C", "text": "Write"}, {"key": "D", "text": "Writing"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('27f8595a-c6c1-4d0b-b129-74a11975835b', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct order?', 'mcq', 1, 80, TRUE, '{"options": [{"key": "A", "text": "She loves playing the piano."}, {"key": "B", "text": "She loves the playing piano."}, {"key": "C", "text": "Loves she playing the piano."}, {"key": "D", "text": "Playing the piano loves she."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('43aadf0c-81f4-4f89-a178-3008c8790d47', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is an example of a preposition of place?', 'mcq', 1, 81, TRUE, '{"options": [{"key": "A", "text": "After"}, {"key": "B", "text": "On"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Before"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2c6bdb6e-714b-4031-af4e-57faf50fbdaf', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is written in the active voice?', 'mcq', 1, 82, TRUE, '{"options": [{"key": "A", "text": "The book was read by her."}, {"key": "B", "text": "The book is being read by her."}, {"key": "C", "text": "She read the book."}, {"key": "D", "text": "The book will be read by her."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('956a2461-1f4e-4746-bf0a-27eb9872ef0d', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is an example of a compound sentence?', 'mcq', 1, 83, TRUE, '{"options": [{"key": "A", "text": "I want to go to the store, but I don’t have enough money."}, {"key": "B", "text": "I like pizza."}, {"key": "C", "text": "Although I am tired, I went to the gym."}, {"key": "D", "text": "She sings well."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0a21676c-62c3-4e9d-b76b-547f693bf6f5', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence contains an adjective clause?', 'mcq', 1, 84, TRUE, '{"options": [{"key": "A", "text": "The girl who sings is my sister."}, {"key": "B", "text": "The girl sings."}, {"key": "C", "text": "She is my sister."}, {"key": "D", "text": "The girl sings beautifully."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6861cc39-c6a7-49a7-8671-6f408e9d4133', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following sentences uses an object pronoun?', 'mcq', 1, 85, TRUE, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "I gave him the book."}, {"key": "C", "text": "She likes reading."}, {"key": "D", "text": "I like her."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('73ee9231-cb32-40f2-814c-23c6fb8d0c61', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these is the correct plural form of "city"?', 'mcq', 1, 86, TRUE, '{"options": [{"key": "A", "text": "Citie"}, {"key": "B", "text": "Cities"}, {"key": "C", "text": "Citys"}, {"key": "D", "text": "Citis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('61791210-0001-42ae-82ee-721985671687', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the possessive form of "cat"?', 'mcq', 1, 87, TRUE, '{"options": [{"key": "A", "text": "Cats''"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Cat''s"}, {"key": "D", "text": "Cats"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('64e8c6a5-7759-4241-b72c-cb9c16d1f3b7', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences is correct?', 'mcq', 1, 88, TRUE, '{"options": [{"key": "A", "text": "He can singing well."}, {"key": "B", "text": "He sings well."}, {"key": "C", "text": "He singing well."}, {"key": "D", "text": "He can sing well."}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a5c6ab92-da70-472a-881d-2dc5d2fa9762', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is a noun?', 'mcq', 1, 89, TRUE, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Jump"}, {"key": "C", "text": "Happiness"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4418dcca-3dbc-4f2d-bf89-6c97aeb42056', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the past perfect continuous tense?', 'mcq', 1, 90, TRUE, '{"options": [{"key": "A", "text": "I had been waiting for an hour."}, {"key": "B", "text": "I was waiting for an hour."}, {"key": "C", "text": "I waited for an hour."}, {"key": "D", "text": "I have been waiting for an hour."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1b485dff-313d-4d9d-adbf-64556e6899ac', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the present continuous tense?', 'mcq', 1, 91, TRUE, '{"options": [{"key": "A", "text": "I am eating lunch."}, {"key": "B", "text": "I eat lunch every day."}, {"key": "C", "text": "I will eat lunch tomorrow."}, {"key": "D", "text": "I ate lunch yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ef00cbbb-c64e-4098-8277-1eb1d97a8da5', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these words is an adjective?', 'mcq', 1, 92, TRUE, '{"options": [{"key": "A", "text": "Happily"}, {"key": "B", "text": "Happiness"}, {"key": "C", "text": "Bright"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d2a9f26d-3510-4205-9cc4-eb3c88eae971', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of the following is the correct contraction for "they are"?', 'mcq', 1, 93, TRUE, '{"options": [{"key": "A", "text": "Theyre"}, {"key": "B", "text": "They''re"}, {"key": "C", "text": "Theys"}, {"key": "D", "text": "They"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ad671e98-0ada-4f34-967e-3a81c7cb3043', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is a synonym of "start"?', 'mcq', 1, 94, TRUE, '{"options": [{"key": "A", "text": "Begin"}, {"key": "B", "text": "End"}, {"key": "C", "text": "Finish"}, {"key": "D", "text": "Stop"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8885d4c9-211e-40a2-8d54-5f06ea5ce6cc', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence uses "your" correctly?', 'mcq', 1, 95, TRUE, '{"options": [{"key": "A", "text": "Your my friend."}, {"key": "B", "text": "Your going to the store."}, {"key": "C", "text": "Is this your book?"}, {"key": "D", "text": "Youre my friend."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('09b779ad-c01f-4008-b760-2a5df38f4656', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which word is an antonym of "hot"?', 'mcq', 1, 96, TRUE, '{"options": [{"key": "A", "text": "Warm"}, {"key": "B", "text": "Cold"}, {"key": "C", "text": "Boiling"}, {"key": "D", "text": "Spicy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8ab685b7-25e2-4a50-9dc7-fc15f83193a5', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which sentence is in the correct past tense form?', 'mcq', 1, 97, TRUE, '{"options": [{"key": "A", "text": "He runs to school."}, {"key": "B", "text": "He run to school."}, {"key": "C", "text": "He ran to school."}, {"key": "D", "text": "He running to school."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9a844df1-8ffc-4261-bc4f-93f7ed1d3217', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'What is the proper plural form of "child"?', 'mcq', 1, 98, TRUE, '{"options": [{"key": "A", "text": "Childrens"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childs"}, {"key": "D", "text": "Childern"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('608e203e-13e1-4036-bf34-ba9306413c56', '48d0eca9-831a-4761-af47-f7a9e0251135', '212a0413-ef12-431f-9785-0f402385b45f', 'Which of these sentences is a negative statement?', 'mcq', 1, 99, TRUE, '{"options": [{"key": "A", "text": "I am going to the park."}, {"key": "B", "text": "I amnot going to the park."}, {"key": "C", "text": "I go to the park."}, {"key": "D", "text": "I will go to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Section B – Research Aptitude Test (100 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2464bb78-0f4c-412b-b1db-d36e2d5efdb0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the first step in the research process?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "Literature review"}, {"key": "B", "text": "Data collection"}, {"key": "C", "text": "Defining the research problem"}, {"key": "D", "text": "Hypothesis formulation"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('def925a0-caa6-4c72-8da2-ff6d78ab250d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a type of primary data collection method?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "Textbooks"}, {"key": "B", "text": "Surveys"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Published articles"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a651be66-cdc1-46ee-ab0f-8ee5433db544', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Sampling'' refer to in research?', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "Collecting data from all subjects"}, {"key": "B", "text": "The technique used to select a sample"}, {"key": "C", "text": "Collecting data from secondary sources"}, {"key": "D", "text": "Analyzing the entire population"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('abc653d7-a1b3-427f-a2ec-3b0d9c24fd68', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which sampling technique involves dividing a population into subgroups and selecting a sample from each subgroup?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Cluster sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('45f8422a-5f2d-40db-85a6-742866807688', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research design focuses on establishing causal relationships between variables?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "Descriptive research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1b77e3dd-7dc2-4447-a9ae-6b31141d1709', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Variable'' refers to:', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "A fixed characteristic in a study"}, {"key": "B", "text": "An element that can vary or change"}, {"key": "C", "text": "The sample used in research"}, {"key": "D", "text": "The research methodology"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1e36d513-3573-4727-b81a-e9ac967d40a8', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Reliability'' in the context of research?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "The accuracy of the data"}, {"key": "B", "text": "The consistency of the measurement"}, {"key": "C", "text": "The depth of the study"}, {"key": "D", "text": "The bias in the research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('90437922-caba-4d80-8328-b571ae74a243', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'A hypothesis is:', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "A theory"}, {"key": "B", "text": "A question to be answered"}, {"key": "C", "text": "A tentative assumption or proposition that can be tested"}, {"key": "D", "text": "A conclusion drawn from data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fbc185d8-23c4-44e9-8a21-20d88f55442c', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a characteristic of qualitative research?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "Numerical data analysis"}, {"key": "B", "text": "Statistical tests"}, {"key": "C", "text": "Focus on understanding meaning and experiences"}, {"key": "D", "text": "Large sample sizes"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3e6cf7e7-0663-4cc5-8f49-195a56c21ee8', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The method of research that involves detailed study of a single case is called:', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "Survey research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Case study research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3e746a57-5ad1-41c4-821d-5c0cc8ed3a90', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of a research study, which of the following is known as ''The independent variable''?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "The variable that is manipulated or changed"}, {"key": "B", "text": "The outcome of interest"}, {"key": "C", "text": "The variable that remains constant"}, {"key": "D", "text": "The group being studied"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('90be3ba7-6cb4-46a5-b644-b0b20804bdf0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of data analysis is used to interpret numerical data?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "Thematic analysis"}, {"key": "B", "text": "Quantitative analysis"}, {"key": "C", "text": "Content analysis"}, {"key": "D", "text": "Narrative analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b15781db-8724-42ec-a90d-f70a25188887', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of secondary data?', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "Interview transcripts"}, {"key": "B", "text": "Survey responses"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Observation records"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b929ed34-2017-496c-bd35-a66a3f97676a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research methodology uses unstructured data such as interviews, focus groups, and observations?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "Quantitative research"}, {"key": "B", "text": "Qualitative research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0b42b1fc-ac56-49cd-987a-2b26a9f06fe7', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a non-probability sampling technique?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "Stratified random sampling"}, {"key": "B", "text": "Simple random sampling"}, {"key": "C", "text": "Systematic sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0da3c385-e5dc-4db6-96f8-f93a0d6d42f7', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Literature review'' refers to:', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "A detailed analysis of your findings"}, {"key": "B", "text": "A summary of previously published research"}, {"key": "C", "text": "A list of research questions"}, {"key": "D", "text": "A summary of the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c74eb554-c725-4664-9a4c-8fd9ba96a853', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does a ''Descriptive'' research design aim to do?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "Predict future trends"}, {"key": "B", "text": "Determine cause-effect relationships"}, {"key": "C", "text": "Describe characteristics of a phenomenon"}, {"key": "D", "text": "Test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('36347850-fb76-43ba-9822-fe9ace09716d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a dependent variable?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Age"}, {"key": "B", "text": "Gender"}, {"key": "C", "text": "Test scores"}, {"key": "D", "text": "Treatment conditions"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('022dc9e9-993f-44f4-9d55-0642ffc88ead', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the ''Control group'' in an experimental design?', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "The group that receives the treatment"}, {"key": "B", "text": "The group that is not exposed to the experimental treatment"}, {"key": "C", "text": "The group with the largest sample size"}, {"key": "D", "text": "The group selected randomly"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7b23d088-67d2-4d68-9154-7066eaa8473f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, ''Ethics'' refers to:', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "The methods used for data collection"}, {"key": "B", "text": "The ways in which data is analyzed"}, {"key": "C", "text": "The moral principles governing research conduct"}, {"key": "D", "text": "The number of participants in a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4e183fe7-64e7-4a80-9bba-6c061034d234', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT an example of a research instrument?', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Questionnaire"}, {"key": "B", "text": "Observation checklist"}, {"key": "C", "text": "Software tool for data analysis"}, {"key": "D", "text": "Theoretical framework"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b7070992-09bf-40ed-86b5-1be560b30b59', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a common statistical technique for analyzing relationships between two variables?', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "Regression analysis"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "Factor analysis"}, {"key": "D", "text": "Ethnographic analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f411c91f-eff3-4fa4-a57b-09e3b99cae30', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main purpose of an abstract in a research paper?', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "To summarize the entire study"}, {"key": "B", "text": "To explain the methodology in detail"}, {"key": "C", "text": "To list all the references used"}, {"key": "D", "text": "To provide a detailed discussion of findings"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f3c2ccbb-81ae-4384-a458-899f199add21', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of qualitative data?', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "Test scores"}, {"key": "B", "text": "Weight measurements"}, {"key": "C", "text": "Interview responses"}, {"key": "D", "text": "Blood pressure readings"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4e11cb1b-44dd-4a2c-9aa7-074acf4e21e1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is considered a strength of using surveys in research?', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "They provide detailed, in-depth data"}, {"key": "B", "text": "They are cost-effective and allow data collection from large groups"}, {"key": "C", "text": "They are not influenced by researcher bias"}, {"key": "D", "text": "They do not require ethical considerations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cb4d1a44-b4aa-4206-abeb-79550f7c6182', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The term ''Validity'' refers to:', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "The error of measurement"}, {"key": "B", "text": "The accuracy of the measurement"}, {"key": "C", "text": "The ability to repeat the experiment"}, {"key": "D", "text": "The extent to which results are real"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('71cd6235-3d71-406d-ae78-d584ad4064fd', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research method is based on structured observations and statistical tests?', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Quantitative research"}, {"key": "C", "text": "Ethnography"}, {"key": "D", "text": "Grounded theory"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cac54735-8cb8-4f74-8875-4e14a800a283', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Theoretical framework'' in a research study?', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "A summary of the study’s findings"}, {"key": "B", "text": "The foundation of theories on which the study is based"}, {"key": "C", "text": "The data collection tool used"}, {"key": "D", "text": "The statistical method employed"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3ddda3c2-a240-4fa5-952f-94b6113c1bdf', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Inferential statistics''?', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "Mean"}, {"key": "B", "text": "Median"}, {"key": "C", "text": "Hypothesis testing"}, {"key": "D", "text": "Frequency distribution"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('48f4e2ce-ade7-4c2f-9594-70e7850ed914', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research uses a longitudinal approach, collecting data over an extended period of time?', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Cross-sectional research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Action research"}, {"key": "D", "text": "Longitudinal research"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fb7a8022-71aa-4381-bfbc-bde9518447e8', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the research process, ''Data analysis'' refers to:', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "Writing the research report"}, {"key": "B", "text": "Organizing and interpreting the collected data"}, {"key": "C", "text": "Collecting data from participants"}, {"key": "D", "text": "Reviewing the literature"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('77f06b90-486f-46e1-872d-eaec4cc268a8', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a qualitative research method?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Experiments"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Statistical analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('da227dd9-8446-4cb1-8a8c-ac1670564812', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'The ''P-value'' in hypothesis testing is used to:', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "Measure the effect size"}, {"key": "B", "text": "Determine the likelihood that results are due to chance"}, {"key": "C", "text": "Estimate the sample size"}, {"key": "D", "text": "Summarize the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('380ac615-acb2-4116-9918-9fea12d889fc', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT an ethical consideration in research?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "Confidentiality"}, {"key": "B", "text": "Informed consent"}, {"key": "C", "text": "Manipulating data"}, {"key": "D", "text": "Protection from harm"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('620df4bb-a02f-441d-a322-e5dfae3a5c1f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the role of the ''Literature Review'' in the research process?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "To describe the methodology used"}, {"key": "B", "text": "To identify gaps in existing research"}, {"key": "C", "text": "To summarize the data collected"}, {"key": "D", "text": "To discuss the results of the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0aa0a469-9e87-4896-992b-8df9fe457617', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Ethnography'' is:', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "The study of statistical data"}, {"key": "B", "text": "The analysis of cultural and social phenomena"}, {"key": "C", "text": "The observation of behaviors in controlled settings"}, {"key": "D", "text": "The analysis of numerical data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('92058bc9-dacc-4831-88e0-54bb43039df6', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT a characteristic of a well-defined research problem?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "It is clear and focused"}, {"key": "B", "text": "It is specific and researchable"}, {"key": "C", "text": "It is broad and vague"}, {"key": "D", "text": "It can be answered through data collection"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0f13bf90-3c5a-4810-8f06-6b27eb957422', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of a ''Cross-sectional'' study design?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "Data is collected at a single point in time"}, {"key": "B", "text": "Data is collected over a long period"}, {"key": "C", "text": "It manipulates variables to establish causality"}, {"key": "D", "text": "It focuses on qualitative analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8be99589-288e-400f-8011-06e887dc12ba', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Random sampling''?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "Selecting participants based on convenience"}, {"key": "B", "text": "Selecting participants who are easily accessible"}, {"key": "C", "text": "Selecting participants in such a way that every member has an equal chance of being chosen"}, {"key": "D", "text": "Selecting participants from specific groups"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9748afb6-584f-4c7e-b055-3b418e950832', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of an extraneous variable in an experiment?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "The manipulated variable"}, {"key": "B", "text": "The outcome of the experiment"}, {"key": "C", "text": "A variable that could influence the dependent variable but is not of interest to the researcher"}, {"key": "D", "text": "The variable that is measured in the experiment"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('aab8f6bd-bd62-452f-a71f-5e2549f93d02', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Non-experimental research''?', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Randomized controlled trial"}, {"key": "C", "text": "Experimental design"}, {"key": "D", "text": "Laboratory experiment"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ce09f007-18d4-4e8f-a655-2bbe972cdc19', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main goal of ''Action Research''?', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "To establish causal relationships"}, {"key": "B", "text": "To solve practical problems and improve practices"}, {"key": "C", "text": "To gather data from large samples"}, {"key": "D", "text": "To test theoretical models"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e29a9096-d1f4-4a8e-b178-c72a1214db76', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Generalizability'' refers to:', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "The ability to replicate the study"}, {"key": "B", "text": "The degree to which the findings can apply to other settings or populations"}, {"key": "C", "text": "The exactness of measurement tools used"}, {"key": "D", "text": "The ethics of the research study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2641ac60-fb0a-4eab-99ce-45312c2ec2c4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a method of collecting qualitative data?', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "Surveys with closed-ended questions"}, {"key": "B", "text": "Observation and interviews"}, {"key": "C", "text": "Statistical analysis"}, {"key": "D", "text": "Hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7af67e5f-e8df-49c1-af5c-30cb37e2619d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is true about the ''Control variable''?', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "It is the variable that is manipulated"}, {"key": "B", "text": "It is the variable that is measured"}, {"key": "C", "text": "It is held constant to prevent it from influencing the outcome"}, {"key": "D", "text": "It is the dependent variable"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4f711afd-e58d-48b4-b054-23326ad8362a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does a ''Descriptive statistic'' help researchers to do?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "Establish cause-and-effect relationships"}, {"key": "B", "text": "Summarize and describe the features of a dataset"}, {"key": "C", "text": "Make inferences about the population"}, {"key": "D", "text": "Conduct hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1ec8f70d-30ad-4231-abb6-b500c919799c', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a qualitative data collection method?', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "Surveys with Likert scale"}, {"key": "B", "text": "Content analysis of documents"}, {"key": "C", "text": "Statistical regression"}, {"key": "D", "text": "Randomized controlled trials"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('128a4502-4bab-45e6-8889-4092516cd451', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the key feature of ''Grounded Theory''?', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "Developing theory based on collected data"}, {"key": "B", "text": "Testing existing theories"}, {"key": "C", "text": "Collecting data through surveys"}, {"key": "D", "text": "Focusing on statistical analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9f154c1e-476d-44f9-8c3c-eb19732219f4', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Operational Definition'' refers to:', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "A variable that is difficult to measure"}, {"key": "B", "text": "A clear, precise description of how variables will be measured"}, {"key": "C", "text": "A theoretical explanation of a concept"}, {"key": "D", "text": "A summary of previous research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cb204425-8a84-4178-8d26-fbf74a7284d9', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of a ''Quantitative'' research approach?', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "Open-ended questions"}, {"key": "B", "text": "Numerical data analysis"}, {"key": "C", "text": "Small sample sizes"}, {"key": "D", "text": "Subjective interpretation of data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bd8690c8-3d69-4647-9ffb-eb895876a5ea', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a common method for assessing reliability?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "Content analysis"}, {"key": "B", "text": "Cronbach’s alpha"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Thematic analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d3263201-cc78-4262-96e4-4ddca2df9416', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a ''Qualitative'' data analysis method?', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "Linear regression"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "T-test"}, {"key": "D", "text": "Correlation analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b1b24ed0-f1d3-42f5-9752-40d1cb1a73f9', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of data analysis is used to identify trends and make predictions?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "Descriptive statistics"}, {"key": "B", "text": "Predictive analysis"}, {"key": "C", "text": "Grounded theory analysis"}, {"key": "D", "text": "Discriminant analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('574877d9-f8fe-45ab-bce1-eb280630cfcc', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the primary goal of ''Hypothesis Testing''?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "To summarize the data"}, {"key": "B", "text": "To test the validity of a proposed relationship between variables"}, {"key": "C", "text": "To collect data"}, {"key": "D", "text": "To define variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7f773553-6cd1-4e8b-85da-a08bdc375969', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Secondary Data''?', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "Interview responses from participants"}, {"key": "B", "text": "Focus group discussions"}, {"key": "C", "text": "Data collected from existing studies and reports"}, {"key": "D", "text": "Observational data collected during a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0737131b-76d6-4610-9f2e-6c199039971b', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which research method uses ''Random assignment'' to assign participants to different groups?', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "Case study research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Observational research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('461a698f-0733-43ad-a72a-57cf8b05c692', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is a key feature of ''Mixed Methods Research''?', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "Using only one type of data (quantitative or qualitative)"}, {"key": "B", "text": "Combining both quantitative and qualitative data collection and analysis"}, {"key": "C", "text": "Focusing solely on theory development"}, {"key": "D", "text": "Emphasizing statistical analysis exclusively"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5145b6bd-3c48-433b-a47e-5e0dfc91bbc7', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Bias'' in research?', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "The objective measurement of variables"}, {"key": "B", "text": "The unintended influence on study results"}, {"key": "C", "text": "A clear, reproducible result"}, {"key": "D", "text": "The random selection of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0fa2d079-80bb-47ed-9e81-d4b7c36b6e54', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, the ''Dependent Variable'' is:', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "The variable that is manipulated by the researcher"}, {"key": "B", "text": "The variable that changes in response to the independent variable"}, {"key": "C", "text": "The variable that remains constant throughout the study"}, {"key": "D", "text": "The outcome of the researcher''s actions"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5696678e-74a1-4102-a954-54ad78826218', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a feature of ''Qualitative Research''?', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "Large sample sizes"}, {"key": "B", "text": "Numerical analysis"}, {"key": "C", "text": "Focus on individual experiences and meanings"}, {"key": "D", "text": "Use of statistical techniques for hypothesis testing"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a16e6954-0b96-43af-b5d5-9c51a8f41fbf', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Systematic sampling''?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "Selecting every nth person from a list"}, {"key": "B", "text": "Selecting participants based on their availability"}, {"key": "C", "text": "Randomly selecting participants from a population"}, {"key": "D", "text": "Selecting participants from specific subgroups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fd4add27-c379-4716-9ca3-5b4bb8d7253a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the primary disadvantage of using ''Self-reported data''?', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "The data is difficult to interpret"}, {"key": "B", "text": "It is time-consuming to collect"}, {"key": "C", "text": "It may be subject to bias and inaccurate responses"}, {"key": "D", "text": "It provides too much detail"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('889dc5ed-02e5-4286-97ca-02948c7cadbc', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is the purpose of ''Inferential statistics''?', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "To summarize the characteristics of a dataset"}, {"key": "B", "text": "To make inferences or predictions about a population based on a sample"}, {"key": "C", "text": "To describe data visually"}, {"key": "D", "text": "To explore relationships between variables in detail"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1fbd96dc-2250-4bee-92ad-ca343ae181e6', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an ethical requirement in human research studies?', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "Offering participants financial incentives"}, {"key": "B", "text": "Informed consent from participants"}, {"key": "C", "text": "Using only quantitative methods"}, {"key": "D", "text": "Excluding vulnerable populations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('383b9a59-c699-4dd4-a9e0-46cac9ee1290', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the purpose of ''Randomization'' in an experimental study?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "To reduce sample size"}, {"key": "B", "text": "To ensure that every participant has an equal chance of being assigned to any group"}, {"key": "C", "text": "To control for variables"}, {"key": "D", "text": "To increase participant participation"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('aecfe41d-785c-41f2-97d6-d59435682a79', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research focuses on understanding the lived experiences of individuals through detailed interviews and observations?', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "Phenomenological research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bc2999ea-8f69-48bd-a11f-f98cb4f3d180', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of a ''Quantitative research instrument''?', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "Interview guide"}, {"key": "B", "text": "Questionnaire with Likert scale"}, {"key": "C", "text": "Observation notes"}, {"key": "D", "text": "Case study protocol"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8944e2ac-4d9d-4c4b-b927-744529d73796', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Participant observation'' involve in qualitative research?', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "Collecting data without any interaction with the participants"}, {"key": "B", "text": "Observing participants from a distance with no involvement"}, {"key": "C", "text": "Actively engaging with participants while observing their behavior"}, {"key": "D", "text": "Collecting numerical data from the participants"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dcb7818b-2c34-4485-bf5a-920e7d1ab6c0', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following best describes the ''Clarity'' of a research hypothesis?', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "It is general and vague"}, {"key": "B", "text": "It should be stated in clear, testable terms"}, {"key": "C", "text": "It should be untestable"}, {"key": "D", "text": "It does not need to specify the relationship between variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('46897211-da44-4199-9583-dab30c31c6a1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following methods is commonly used in ''Exploratory Research''?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Case studies"}, {"key": "C", "text": "Controlled experiments"}, {"key": "D", "text": "Focus groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5d890fcf-9ea7-4c0d-b31f-bfeff58e2206', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Purposive sampling''?', 'mcq', 1, 70, TRUE, '{"options": [{"key": "A", "text": "A non-random method of selecting participants based on specific characteristics"}, {"key": "B", "text": "A random selection of participants from a population"}, {"key": "C", "text": "Selecting participants who are easy to access"}, {"key": "D", "text": "Selecting participants based on their willingness to participate"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1b00acc6-7f89-4dc9-9560-e81f24dc0f44', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the main advantage of ''Random Sampling''?', 'mcq', 1, 71, TRUE, '{"options": [{"key": "A", "text": "It eliminates bias in the selection of participants"}, {"key": "B", "text": "It requires less time and effort"}, {"key": "C", "text": "It ensures all variables are controlled"}, {"key": "D", "text": "It guarantees accurate results for qualitative studies"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('578b2ca6-0db0-433c-a654-8788a9d0ec95', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a type of research where the researcher manipulates the independent variable?', 'mcq', 1, 72, TRUE, '{"options": [{"key": "A", "text": "Correlational research"}, {"key": "B", "text": "Descriptive research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Observational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e4811f1f-9236-4d40-bbc5-d2dfee6939b9', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Triangulation'' in research?', 'mcq', 1, 73, TRUE, '{"options": [{"key": "A", "text": "Using multiple data sources, methods, or theories to increase the validity of research findings"}, {"key": "B", "text": "The process of analyzing data with one method only"}, {"key": "C", "text": "The testing of hypotheses with experimental methods only"}, {"key": "D", "text": "The selection of a single data source for analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f4219cb2-49e0-4df1-b5e5-d1788d310d5d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is true about a ''Longitudinal'' study?', 'mcq', 1, 74, TRUE, '{"options": [{"key": "A", "text": "Data is collected at one point in time"}, {"key": "B", "text": "It is conducted over an extended period of time to track changes over time"}, {"key": "C", "text": "It manipulates variables to establish cause-effect relationships"}, {"key": "D", "text": "It focuses on a small group of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8fc58182-c70b-4bdc-b24b-90153f39f222', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Reliability'' in research?', 'mcq', 1, 75, TRUE, '{"options": [{"key": "A", "text": "The accuracy of measurement"}, {"key": "B", "text": "The consistency of measurement over time"}, {"key": "C", "text": "The significance of results"}, {"key": "D", "text": "The ability to generalize results"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5cfffc91-2b97-4428-b533-3d7a11fc574c', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is NOT a feature of ''Descriptive Research''?', 'mcq', 1, 76, TRUE, '{"options": [{"key": "A", "text": "It focuses on describing characteristics or phenomena"}, {"key": "B", "text": "It manipulates variables to test hypotheses"}, {"key": "C", "text": "It collects data to summarize the situation"}, {"key": "D", "text": "It is often used to create baseline data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f5d20866-37d5-4502-99d2-96f721388123', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which sampling method ensures that the population is evenly represented by dividing it into distinct subgroups?', 'mcq', 1, 77, TRUE, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Snowball sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c486f1c0-cae0-42e6-a6d4-e961aa5cc25a', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a research study, the ''Independent Variable'' is:', 'mcq', 1, 78, TRUE, '{"options": [{"key": "A", "text": "The variable that is measured or observed"}, {"key": "B", "text": "The variable that remains constant"}, {"key": "C", "text": "The variable that is manipulated or changed by the researcher"}, {"key": "D", "text": "The variable that is not related to the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8bc3f319-2cff-4e2b-801b-b569ca99a289', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Sampling Bias'' refer to?', 'mcq', 1, 79, TRUE, '{"options": [{"key": "A", "text": "The random selection of participants"}, {"key": "B", "text": "The tendency to select participants who represent the population"}, {"key": "C", "text": "The error introduced due to non-random selection of participants"}, {"key": "D", "text": "The statistical analysis of the sample data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f8820d5c-482e-4dc6-952f-11386ef5569f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Nominal'' data?', 'mcq', 1, 80, TRUE, '{"options": [{"key": "A", "text": "Height of individuals"}, {"key": "B", "text": "Types of fruits (apple, banana, orange)"}, {"key": "C", "text": "Temperatures in Celsius"}, {"key": "D", "text": "Weight of animals"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c739757d-fbde-4850-92bb-0f91c2a5cd66', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following best describes ''Secondary Research''?', 'mcq', 1, 81, TRUE, '{"options": [{"key": "A", "text": "Collecting data directly from participants"}, {"key": "B", "text": "Analyzing existing data collected by other researchers"}, {"key": "C", "text": "Conducting surveys to gather original data"}, {"key": "D", "text": "Experimenting with new data collection methods"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('500ad489-30a2-4c42-b852-b32bc79768b5', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the purpose of ''Theoretical Framework'' in research?', 'mcq', 1, 82, TRUE, '{"options": [{"key": "A", "text": "To define the scope of the study"}, {"key": "B", "text": "To guide data analysis and interpretation"}, {"key": "C", "text": "To test hypotheses"}, {"key": "D", "text": "To collect primary data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4e7d27c1-f661-4924-80c8-e68172080bac', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Interval'' data?', 'mcq', 1, 83, TRUE, '{"options": [{"key": "A", "text": "Number of students in a class"}, {"key": "B", "text": "Temperature in Celsius"}, {"key": "C", "text": "Eye color of individuals"}, {"key": "D", "text": "Gender of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0d4b3247-81dd-4bdc-b692-5036c0cc87a8', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In a ''Causal-comparative research design'', researchers try to:', 'mcq', 1, 84, TRUE, '{"options": [{"key": "A", "text": "Observe and describe behaviors"}, {"key": "B", "text": "Establish cause-and-effect relationships"}, {"key": "C", "text": "Focus on one individual case"}, {"key": "D", "text": "Compare differences in unrelated groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('073fda29-91b6-4bd3-b72f-a183cdd9f3be', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is the primary function of ''Pilot Testing'' in research?', 'mcq', 1, 85, TRUE, '{"options": [{"key": "A", "text": "To test the final data analysis"}, {"key": "B", "text": "To gather primary data"}, {"key": "C", "text": "To test the research design and instruments before the main study"}, {"key": "D", "text": "To calculate the sample size"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('746aaa78-1a0d-4c6e-b337-73c6686fe693', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is a ''Double-blind'' experiment?', 'mcq', 1, 86, TRUE, '{"options": [{"key": "A", "text": "An experiment where both participants and experimenters are unaware of the group assignments"}, {"key": "B", "text": "An experiment where only participants are unaware of the group assignments"}, {"key": "C", "text": "An experiment where only the researchers are unaware of the outcomes"}, {"key": "D", "text": "An experiment involving two different types of groups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cb88e7bf-5ea3-4ecd-8e4d-6a0159145e54', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following describes ''Naturalistic Observation''?', 'mcq', 1, 87, TRUE, '{"options": [{"key": "A", "text": "Observing participants in a controlled lab setting"}, {"key": "B", "text": "Observing participants without their knowledge"}, {"key": "C", "text": "Observing participants in their natural environment without interference"}, {"key": "D", "text": "Manipulating the environment to test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ce58f120-8596-4c58-a865-d166963e2efe', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In research, ''Confounding Variables'' are:', 'mcq', 1, 88, TRUE, '{"options": [{"key": "A", "text": "Variables that are irrelevant to the study"}, {"key": "B", "text": "Variables that are deliberately manipulated"}, {"key": "C", "text": "Variables that affect the dependent variable but are not part of the research design"}, {"key": "D", "text": "Variables that are measured during the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('24bda5f7-4086-48cf-8a18-acc0cb14985f', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which type of research is used to investigate the relationships between variables without manipulating them?', 'mcq', 1, 89, TRUE, '{"options": [{"key": "A", "text": "Experimental research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('eba0b6fc-fa76-4a1b-bd56-934e7299211d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is an example of ''Ethnographic Research''?', 'mcq', 1, 90, TRUE, '{"options": [{"key": "A", "text": "Surveying a large population"}, {"key": "B", "text": "Conducting in-depth interviews with participants"}, {"key": "C", "text": "Studying cultural groups through immersion and observation"}, {"key": "D", "text": "Analyzing historical documents"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b3fbeff3-7f1e-4017-9140-2488657cc3c1', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Cluster Sampling'' involve?', 'mcq', 1, 91, TRUE, '{"options": [{"key": "A", "text": "Dividing the population into groups and randomly selecting from those groups"}, {"key": "B", "text": "Randomly selecting individuals from the population"}, {"key": "C", "text": "Selecting every nth participant from a list"}, {"key": "D", "text": "Selecting participants based on their specific traits"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b77bbd14-e494-47a2-85e0-f572f7d4dd34', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a disadvantage of using ''Convenience Sampling''?', 'mcq', 1, 92, TRUE, '{"options": [{"key": "A", "text": "It is time-consuming and expensive"}, {"key": "B", "text": "It provides a high degree of randomness"}, {"key": "C", "text": "It may introduce sampling bias due to ease of selection"}, {"key": "D", "text": "It requires sophisticated data analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a87373d7-304e-43b4-ba24-069a2af25b0d', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Content Analysis'' typically involve in qualitative research?', 'mcq', 1, 93, TRUE, '{"options": [{"key": "A", "text": "Analyzing statistical data from surveys"}, {"key": "B", "text": "Analyzing text, media, or documents to identify patterns or themes"}, {"key": "C", "text": "Conducting interviews and analyzing responses"}, {"key": "D", "text": "Conducting experiments to test hypotheses"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ff00a7b5-1a68-451d-ab43-afcb1998b967', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a key advantage of ''Focus Groups'' in qualitative research?', 'mcq', 1, 94, TRUE, '{"options": [{"key": "A", "text": "Provides large-scale data"}, {"key": "B", "text": "Allows in-depth exploration of participants'' experiences and opinions"}, {"key": "C", "text": "Involves only quantitative data collection"}, {"key": "D", "text": "Is highly objective and free from bias"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6e98f715-9d0d-4bc1-8f55-df9f9cded968', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''Multivariate Analysis'' examine?', 'mcq', 1, 95, TRUE, '{"options": [{"key": "A", "text": "The relationship between two variables"}, {"key": "B", "text": "The relationship between more than two variables simultaneously"}, {"key": "C", "text": "The cause-and-effect relationship between variables"}, {"key": "D", "text": "The frequency distribution of a single variable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('eedb31a7-ad9a-4c21-917c-0409e894dc54', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'In the context of research, ''Transparency'' refers to:', 'mcq', 1, 96, TRUE, '{"options": [{"key": "A", "text": "The clarity of the research hypothesis"}, {"key": "B", "text": "The openness and clarity in reporting the research process and findings"}, {"key": "C", "text": "The use of complex statistical methods"}, {"key": "D", "text": "The confidentiality of participant information"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ec380c9e-7ddf-4ef3-8c2e-1fdb6d2620fc', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'Which of the following is a key element in a ''Research Proposal''?', 'mcq', 1, 97, TRUE, '{"options": [{"key": "A", "text": "The collection of data"}, {"key": "B", "text": "The introduction and review of the literature"}, {"key": "C", "text": "The detailed results of the study"}, {"key": "D", "text": "The data analysis techniques used in the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f7cc63e7-27ac-45dc-8290-db6e75e1a348', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What is ''Internal Validity'' in research?', 'mcq', 1, 98, TRUE, '{"options": [{"key": "A", "text": "The degree to which the study results can be generalized to other settings"}, {"key": "B", "text": "The consistency of the research results over time"}, {"key": "C", "text": "The degree to which the study accurately measures the intended variables"}, {"key": "D", "text": "The ethical considerations of the research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('eea784b7-3495-4b96-aea8-6d463ec875ee', '48d0eca9-831a-4761-af47-f7a9e0251135', '778c4f5b-0632-406f-a955-abbe415cf50e', 'What does ''External Validity'' refer to in research?', 'mcq', 1, 99, TRUE, '{"options": [{"key": "A", "text": "The consistency of the research results"}, {"key": "B", "text": "The extent to which the results can be generalized to other populations or settings"}, {"key": "C", "text": "The ethical treatment of participants"}, {"key": "D", "text": "The precision of measurement tools used"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Section C – Logical Reasoning Test (100 questions)
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('62fc8ddb-96f4-4dbe-952b-a341f4678ad8', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '2, 6, 12, 20, 30, ?', 'mcq', 1, 0, TRUE, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3f680db6-9d06-40fb-93bb-f0fa8dff1065', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '5, 10, 20, 40, ?', 'mcq', 1, 1, TRUE, '{"options": [{"key": "A", "text": "60"}, {"key": "B", "text": "70"}, {"key": "C", "text": "80"}, {"key": "D", "text": "100"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7caeb85a-be79-4b1f-bb22-e54790684d74', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '1, 4, 9, 16, 25, ?', 'mcq', 1, 2, TRUE, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "36"}, {"key": "C", "text": "49"}, {"key": "D", "text": "64"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ea69e3d5-20f4-4b2e-85b2-44e6b4fdb6d5', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '3, 8, 15, 24, 35, ?', 'mcq', 1, 3, TRUE, '{"options": [{"key": "A", "text": "46"}, {"key": "B", "text": "48"}, {"key": "C", "text": "50"}, {"key": "D", "text": "52"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3bb5d289-a095-4c6e-9293-c534bcd99f01', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '7, 14, 28, 56, ?', 'mcq', 1, 4, TRUE, '{"options": [{"key": "A", "text": "98"}, {"key": "B", "text": "112"}, {"key": "C", "text": "120"}, {"key": "D", "text": "124"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b15ef4f9-fbb9-4439-8022-447cc37da5db', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '11, 13, 17, 19, 23, ?', 'mcq', 1, 5, TRUE, '{"options": [{"key": "A", "text": "25"}, {"key": "B", "text": "27"}, {"key": "C", "text": "29"}, {"key": "D", "text": "31"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a44e7ba9-3706-4f52-bfba-33a064e99efe', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '2, 5, 10, 17, 26, ?', 'mcq', 1, 6, TRUE, '{"options": [{"key": "A", "text": "35"}, {"key": "B", "text": "37"}, {"key": "C", "text": "39"}, {"key": "D", "text": "41"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('ed4a903e-4b54-4350-8550-8868d48e7f27', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '81, 27, 9, 3, ?', 'mcq', 1, 7, TRUE, '{"options": [{"key": "A", "text": "1"}, {"key": "B", "text": "2"}, {"key": "C", "text": "4"}, {"key": "D", "text": "6"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('64ee60f1-6535-4e89-85d3-74f81fed1ef6', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '4, 9, 16, 25, 36, ?', 'mcq', 1, 8, TRUE, '{"options": [{"key": "A", "text": "47"}, {"key": "B", "text": "48"}, {"key": "C", "text": "49"}, {"key": "D", "text": "50"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e620f06b-a23e-4d0c-a076-593e50c02876', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', '1, 8, 27, 64, ?', 'mcq', 1, 9, TRUE, '{"options": [{"key": "A", "text": "81"}, {"key": "B", "text": "100"}, {"key": "C", "text": "125"}, {"key": "D", "text": "216"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('438b26ea-ff8c-4295-b269-2444b7dad5ab', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Book : Reading :: Fork : ?', 'mcq', 1, 10, TRUE, '{"options": [{"key": "A", "text": "Writing"}, {"key": "B", "text": "Eating"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Washing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('46a9cd75-c885-4962-8bca-862d16f388fd', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Bird : Nest :: Bee : ?', 'mcq', 1, 11, TRUE, '{"options": [{"key": "A", "text": "Hive"}, {"key": "B", "text": "Hole"}, {"key": "C", "text": "Tree"}, {"key": "D", "text": "Cave"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('236100cd-f3ad-4ab6-826b-6b6096142bd9', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Doctor : Hospital :: Teacher : ?', 'mcq', 1, 12, TRUE, '{"options": [{"key": "A", "text": "School"}, {"key": "B", "text": "Library"}, {"key": "C", "text": "Office"}, {"key": "D", "text": "Home"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d0f267d8-85af-4223-a9f6-4118b890af42', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Puppy : Dog :: Kitten : ?', 'mcq', 1, 13, TRUE, '{"options": [{"key": "A", "text": "Tiger"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Lion"}, {"key": "D", "text": "Rabbit"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2b9925ab-0e7f-4b00-b3e6-9ad4d1a378fb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Foot : Shoe :: Hand : ?', 'mcq', 1, 14, TRUE, '{"options": [{"key": "A", "text": "Ring"}, {"key": "B", "text": "Watch"}, {"key": "C", "text": "Glove"}, {"key": "D", "text": "Bracelet"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e7889b4c-90bf-4bbc-803d-0a4ddd1ba0ad', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Water : Thirst :: Food : ?', 'mcq', 1, 15, TRUE, '{"options": [{"key": "A", "text": "Hunger"}, {"key": "B", "text": "Taste"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Energy"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('15dd2a1f-8aa7-42e2-b6fa-65fc197f0a06', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Pen : Ink :: Car : ?', 'mcq', 1, 16, TRUE, '{"options": [{"key": "A", "text": "Petrol"}, {"key": "B", "text": "Wheel"}, {"key": "C", "text": "Driver"}, {"key": "D", "text": "Road"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c8e0a243-f0b4-4646-8484-e898ec1c4fc7', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Eye : See :: Ear : ?', 'mcq', 1, 17, TRUE, '{"options": [{"key": "A", "text": "Touch"}, {"key": "B", "text": "Hear"}, {"key": "C", "text": "Taste"}, {"key": "D", "text": "Speak"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('bb89c54b-0aab-4ab3-9208-c7e653df5f19', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'King : Queen :: Man : ?', 'mcq', 1, 18, TRUE, '{"options": [{"key": "A", "text": "Girl"}, {"key": "B", "text": "Woman"}, {"key": "C", "text": "Lady"}, {"key": "D", "text": "Wife"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3c1192c5-95da-4924-81d6-7bd7b8e957e7', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Fish : Water :: Bird : ?', 'mcq', 1, 19, TRUE, '{"options": [{"key": "A", "text": "Forest"}, {"key": "B", "text": "Air"}, {"key": "C", "text": "Nest"}, {"key": "D", "text": "Tree"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('fc0a6cd1-7dc5-4bc6-aaa9-812ac6a41975', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 20, TRUE, '{"options": [{"key": "A", "text": "Apple"}, {"key": "B", "text": "Mango"}, {"key": "C", "text": "Banana"}, {"key": "D", "text": "Potato"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a49a315f-e3dc-4f6a-8fcc-2966f33c82c6', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 21, TRUE, '{"options": [{"key": "A", "text": "Triangle"}, {"key": "B", "text": "Square"}, {"key": "C", "text": "Circle"}, {"key": "D", "text": "Pencil"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b9968c18-4723-436c-8eb1-6464eecdb731', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 22, TRUE, '{"options": [{"key": "A", "text": "Cow"}, {"key": "B", "text": "Goat"}, {"key": "C", "text": "Sheep"}, {"key": "D", "text": "Eagle"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8be0bc47-d9cf-4ad8-b6e4-fdb62ab0ac47', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 23, TRUE, '{"options": [{"key": "A", "text": "January"}, {"key": "B", "text": "February"}, {"key": "C", "text": "March"}, {"key": "D", "text": "Monday"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('618f65bc-3b4e-4548-8b19-d058e1bbb78f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 24, TRUE, '{"options": [{"key": "A", "text": "Red"}, {"key": "B", "text": "Blue"}, {"key": "C", "text": "Green"}, {"key": "D", "text": "Chair"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b317a429-cf5c-423a-a469-26791340395e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 25, TRUE, '{"options": [{"key": "A", "text": "Bus"}, {"key": "B", "text": "Train"}, {"key": "C", "text": "Bicycle"}, {"key": "D", "text": "Rose"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b9c90527-78b3-44dc-a53b-0d81fee216b0', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 26, TRUE, '{"options": [{"key": "A", "text": "Gold"}, {"key": "B", "text": "Silver"}, {"key": "C", "text": "Copper"}, {"key": "D", "text": "Plastic"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7dd12fca-f69a-4e38-86d2-9472c655ea7b', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 27, TRUE, '{"options": [{"key": "A", "text": "Lion"}, {"key": "B", "text": "Tiger"}, {"key": "C", "text": "Leopard"}, {"key": "D", "text": "Sparrow"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1d9b04ee-6f83-45a2-94ff-9d112ab428b9', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 28, TRUE, '{"options": [{"key": "A", "text": "Cricket"}, {"key": "B", "text": "Football"}, {"key": "C", "text": "Hockey"}, {"key": "D", "text": "Doctor"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7ddaee03-21ea-4de9-b60a-563fc661db60', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find Odd One Out', 'mcq', 1, 29, TRUE, '{"options": [{"key": "A", "text": "Table"}, {"key": "B", "text": "Chair"}, {"key": "C", "text": "Sofa"}, {"key": "D", "text": "Apple"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6cd399bd-835b-40ce-b0ee-cfd39525f708', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CAT = DBU, then DOG = ?', 'mcq', 1, 30, TRUE, '{"options": [{"key": "A", "text": "EPH"}, {"key": "B", "text": "EOH"}, {"key": "C", "text": "FPH"}, {"key": "D", "text": "EPG"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f39f0819-664f-4b2a-90d6-5ec4d7c20162', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If PEN = QFO, then BOOK = ?', 'mcq', 1, 31, TRUE, '{"options": [{"key": "A", "text": "CPPL"}, {"key": "B", "text": "CQQM"}, {"key": "C", "text": "CPPL"}, {"key": "D", "text": "BPPL"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a0a80c88-9af9-43e2-b85b-35e2ae556978', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If ROAD = SPBE, then CAR = ?', 'mcq', 1, 32, TRUE, '{"options": [{"key": "A", "text": "DBS"}, {"key": "B", "text": "DBS"}, {"key": "C", "text": "DBS"}, {"key": "D", "text": "DBS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b9e7fb4e-e1bd-4ad4-821a-f3735af6acb3', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If BAT = 21320, then CAT = ?', 'mcq', 1, 33, TRUE, '{"options": [{"key": "A", "text": "31320"}, {"key": "B", "text": "32320"}, {"key": "C", "text": "31310"}, {"key": "D", "text": "32310"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('97022d7f-e618-4d99-9e62-0e92cb0fb740', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If APPLE = BQQMF, then GRAPE = ?', 'mcq', 1, 34, TRUE, '{"options": [{"key": "A", "text": "HSBQF"}, {"key": "B", "text": "HSBPF"}, {"key": "C", "text": "HSBQG"}, {"key": "D", "text": "HSBRF"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('38228950-0a9b-464d-8c4a-63b22c43580b', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If SUN = TVO, then MOON = ?', 'mcq', 1, 35, TRUE, '{"options": [{"key": "A", "text": "NPPO"}, {"key": "B", "text": "NPPQ"}, {"key": "C", "text": "NQPP"}, {"key": "D", "text": "OPPQ"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('524788a4-3d88-4669-ae78-500537128d30', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CODE = DPEF, then DATA = ?', 'mcq', 1, 36, TRUE, '{"options": [{"key": "A", "text": "EBUB"}, {"key": "B", "text": "EBVA"}, {"key": "C", "text": "ECVB"}, {"key": "D", "text": "FCVB"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('10e06067-43ea-4097-8cd5-c1520e1f0c49', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If KING = LJOH, then QUEEN = ?', 'mcq', 1, 37, TRUE, '{"options": [{"key": "A", "text": "RVFFO"}, {"key": "B", "text": "RVGFO"}, {"key": "C", "text": "RVFFP"}, {"key": "D", "text": "SVFFO"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1de55a3f-94f2-4f86-9826-e93eee9feffb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If BALL = CBMM, then CALL = ?', 'mcq', 1, 38, TRUE, '{"options": [{"key": "A", "text": "DBMM"}, {"key": "B", "text": "DBNN"}, {"key": "C", "text": "EBNN"}, {"key": "D", "text": "DBML"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('30f519c3-32f5-46c1-9433-89b475ff9bfa', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If MOUSE = NPVTF, then RAT = ?', 'mcq', 1, 39, TRUE, '{"options": [{"key": "A", "text": "SBU"}, {"key": "B", "text": "SAT"}, {"key": "C", "text": "RBU"}, {"key": "D", "text": "TBU"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('22be7fa6-73c5-46cc-bc3d-e9f24023afc4', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Statement: All researchers are scholars. Some scholars are writers. Which conclusion follows?', 'mcq', 1, 40, TRUE, '{"options": [{"key": "A", "text": "All writers are researchers"}, {"key": "B", "text": "Some writers are researchers"}, {"key": "C", "text": "Some scholars are researchers"}, {"key": "D", "text": "No writer is a researcher"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2ff5c53f-1cd2-48a6-a8ec-44aeb47aa196', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next term: 2, 6, 12, 20, 30, ?', 'mcq', 1, 41, TRUE, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b02964c9-2c75-49f5-8c11-2d2658b7bf93', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If "BOOK" is coded as "CPPL", then "PEN" is coded as:', 'mcq', 1, 42, TRUE, '{"options": [{"key": "A", "text": "QFO"}, {"key": "B", "text": "QEN"}, {"key": "C", "text": "PFO"}, {"key": "D", "text": "QEP"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b8104859-f4e7-4e3a-889a-d713a08360ea', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which number does not belong?', 'mcq', 1, 43, TRUE, '{"options": [{"key": "A", "text": "16"}, {"key": "B", "text": "25"}, {"key": "C", "text": "36"}, {"key": "D", "text": "48"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('540f2473-fdd6-426f-bc45-d16313d0cb2d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Statement: No scientist is lazy. Some professors are scientists. Conclusion:', 'mcq', 1, 44, TRUE, '{"options": [{"key": "A", "text": "Some professors are not lazy"}, {"key": "B", "text": "All professors are not lazy"}, {"key": "C", "text": "No professor is lazy"}, {"key": "D", "text": "Some lazy people are professors"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('511c244f-c174-403f-be40-41d327323d5c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A clock shows 3:15. What is the angle between the hands?', 'mcq', 1, 45, TRUE, '{"options": [{"key": "A", "text": "0°"}, {"key": "B", "text": "7.5°"}, {"key": "C", "text": "15°"}, {"key": "D", "text": "22.5°"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('2801651e-7b29-4408-a70b-78fccdefa373', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd pair.', 'mcq', 1, 46, TRUE, '{"options": [{"key": "A", "text": "Dog : Bark"}, {"key": "B", "text": "Cow : Moo"}, {"key": "C", "text": "Cat : Roar"}, {"key": "D", "text": "Snake : Hiss"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('08289408-ffb1-49a9-8572-091254e900df', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If A > B, B = C, and C > D, then:', 'mcq', 1, 47, TRUE, '{"options": [{"key": "A", "text": "A < D"}, {"key": "B", "text": "A > D"}, {"key": "C", "text": "A = D"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7c967c6c-cba4-42bb-b44d-6bb43597153d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Complete the series: AZ, BY, CX, DW, ?', 'mcq', 1, 48, TRUE, '{"options": [{"key": "A", "text": "EV"}, {"key": "B", "text": "EU"}, {"key": "C", "text": "FV"}, {"key": "D", "text": "FU"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('dde024d4-44f1-4eb6-82f2-dbac4c62b3d9', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A is taller than B. B is taller than C. D is taller than A. Who is the tallest?', 'mcq', 1, 49, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "D"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('40cb13d6-be60-4b10-8458-dcc11ef0a0dc', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which figure has the greatest number of lines of symmetry?', 'mcq', 1, 50, TRUE, '{"options": [{"key": "A", "text": "Rectangle"}, {"key": "B", "text": "Square"}, {"key": "C", "text": "Triangle"}, {"key": "D", "text": "Parallelogram"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('13ba27e5-15a3-4a00-bdea-fc50f06e0410', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If all roses are flowers and some flowers fade quickly, then:', 'mcq', 1, 51, TRUE, '{"options": [{"key": "A", "text": "All roses fade quickly"}, {"key": "B", "text": "Some roses fade quickly"}, {"key": "C", "text": "No rose fades quickly"}, {"key": "D", "text": "None follows"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3a21c4f9-514c-46c6-abbf-e2b1396d3729', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the missing term: 1, 4, 9, 16, 25, ?', 'mcq', 1, 52, TRUE, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "35"}, {"key": "C", "text": "36"}, {"key": "D", "text": "49"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('6e09808e-cf06-4b12-b3d3-ba74aa6edc9d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'In a class, Ravi is ranked 8th from the top and 15th from the bottom. Total students?', 'mcq', 1, 53, TRUE, '{"options": [{"key": "A", "text": "21"}, {"key": "B", "text": "22"}, {"key": "C", "text": "23"}, {"key": "D", "text": "24"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('3f1542a0-c032-49a3-88c8-fda8363c439f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If "STUDY" is written as "TUVEXZ", then the coding pattern is:', 'mcq', 1, 54, TRUE, '{"options": [{"key": "A", "text": "+1 shift"}, {"key": "B", "text": "+2 shift"}, {"key": "C", "text": "Alternate shifts"}, {"key": "D", "text": "Reverse order"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('742212df-823b-418b-abf6-2b1593ff103d', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which number comes next? 3, 7, 15, 31, 63, ?', 'mcq', 1, 55, TRUE, '{"options": [{"key": "A", "text": "95"}, {"key": "B", "text": "127"}, {"key": "C", "text": "129"}, {"key": "D", "text": "131"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('62b349a5-6dee-4d08-9e23-1f7b65438ed8', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Statement: Some books are journals. All journals are indexed. Conclusion:', 'mcq', 1, 56, TRUE, '{"options": [{"key": "A", "text": "Some books are indexed"}, {"key": "B", "text": "All books are indexed"}, {"key": "C", "text": "No books are indexed"}, {"key": "D", "text": "Some indexed items are not journals"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('cd475ff5-57be-4bf5-abaa-411b8382afb7', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which word is different?', 'mcq', 1, 57, TRUE, '{"options": [{"key": "A", "text": "Physics"}, {"key": "B", "text": "Chemistry"}, {"key": "C", "text": "Biology"}, {"key": "D", "text": "Poetry"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('a8c2075f-9841-411a-baaf-73fc6ce3c557', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A cube has how many edges?', 'mcq', 1, 58, TRUE, '{"options": [{"key": "A", "text": "8"}, {"key": "B", "text": "10"}, {"key": "C", "text": "12"}, {"key": "D", "text": "14"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c2e5751f-8503-491f-980f-374b4b69e6a5', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If South-East becomes North, North-East becomes West, then East becomes:', 'mcq', 1, 59, TRUE, '{"options": [{"key": "A", "text": "South"}, {"key": "B", "text": "North-West"}, {"key": "C", "text": "South-West"}, {"key": "D", "text": "North-East"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f879b7f0-b76b-464e-aa88-78182e7248c2', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next term: 5, 10, 20, 40, 80, ?', 'mcq', 1, 60, TRUE, '{"options": [{"key": "A", "text": "120"}, {"key": "B", "text": "140"}, {"key": "C", "text": "160"}, {"key": "D", "text": "180"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9992e110-1566-49d4-a739-70dee698aafb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Statement: All PhD scholars are researchers. All researchers are learners. Conclusion:', 'mcq', 1, 61, TRUE, '{"options": [{"key": "A", "text": "All learners are researchers"}, {"key": "B", "text": "All PhD scholars are learners"}, {"key": "C", "text": "Some learners are scholars"}, {"key": "D", "text": "None"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d7056e8d-09a8-4323-ba31-5f2ad731a440', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which number is missing? 2, 6, 12, 20, ?, 42', 'mcq', 1, 62, TRUE, '{"options": [{"key": "A", "text": "28"}, {"key": "B", "text": "30"}, {"key": "C", "text": "32"}, {"key": "D", "text": "34"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b7f950e3-242e-49df-9803-f86ac919bdf6', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If "EARTH" is coded as "FBSUI", then "MOON" becomes:', 'mcq', 1, 63, TRUE, '{"options": [{"key": "A", "text": "NPPQ"}, {"key": "B", "text": "NQPO"}, {"key": "C", "text": "NPPO"}, {"key": "D", "text": "NQPP"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('47023c3b-fd89-47c4-a6d0-ba7ab680035f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Five persons P, Q, R, S, T stand in a row. Q is left of R, P is right of S, and T is left of S. Who is in the middle?', 'mcq', 1, 64, TRUE, '{"options": [{"key": "A", "text": "P"}, {"key": "B", "text": "Q"}, {"key": "C", "text": "R"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('18680084-193b-4723-a949-2360583c698a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which Venn diagram relation is correct? Cats, Animals, Birds', 'mcq', 1, 65, TRUE, '{"options": [{"key": "A", "text": "Three overlapping circles"}, {"key": "B", "text": "Cats inside Animals; Birds inside Animals"}, {"key": "C", "text": "Birds inside Cats"}, {"key": "D", "text": "Cats overlap Birds only"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('45dc5b74-0ffe-4762-a1ed-21d1970f38c3', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If 8 workers complete a task in 12 days, how many days will 16 workers take?', 'mcq', 1, 66, TRUE, '{"options": [{"key": "A", "text": "4"}, {"key": "B", "text": "6"}, {"key": "C", "text": "8"}, {"key": "D", "text": "24"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('46a0c11c-bd9f-4b0d-9284-daf2eabbc4f1', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd one out.', 'mcq', 1, 67, TRUE, '{"options": [{"key": "A", "text": "Triangle"}, {"key": "B", "text": "Square"}, {"key": "C", "text": "Circle"}, {"key": "D", "text": "Rectangle"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('31fdf40d-dbf3-4b25-9982-cee3be51f37a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Statement: Some teachers are authors. All authors are educated. Conclusion:', 'mcq', 1, 68, TRUE, '{"options": [{"key": "A", "text": "Some teachers are educated"}, {"key": "B", "text": "All teachers are educated"}, {"key": "C", "text": "No teacher is educated"}, {"key": "D", "text": "Some educated people are teachers"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('27264bcb-687e-4aed-aa35-ba6c4df6ebff', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A man walks 10 m North, 10 m East, 10 m South. How far is he from the starting point?', 'mcq', 1, 69, TRUE, '{"options": [{"key": "A", "text": "0 m"}, {"key": "B", "text": "10 m"}, {"key": "C", "text": "20 m"}, {"key": "D", "text": "30 m"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('f041f9d3-ac61-43fd-b5e4-afd1ee8b442f', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All cats are animals. Tom is a cat.', 'mcq', 1, 70, TRUE, '{"options": [{"key": "A", "text": "Tom is an animal"}, {"key": "B", "text": "Tom is a dog"}, {"key": "C", "text": "Tom is a bird"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d836c381-b548-479a-9230-75e5d611b289', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All roses are flowers. Some flowers are red.', 'mcq', 1, 71, TRUE, '{"options": [{"key": "A", "text": "Some roses are red"}, {"key": "B", "text": "All roses are red"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No rose is red"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d9aa5941-81cc-4bea-bd1a-fc86b4df9d11', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All apples are fruits. All fruits are healthy.', 'mcq', 1, 72, TRUE, '{"options": [{"key": "A", "text": "All apples are healthy"}, {"key": "B", "text": "Some apples are healthy"}, {"key": "C", "text": "No apples are healthy"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b5e28b5c-7d48-4cf2-a8b3-1e0020ff8303', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Some boys are players.', 'mcq', 1, 73, TRUE, '{"options": [{"key": "A", "text": "All boys are players"}, {"key": "B", "text": "Some players are boys"}, {"key": "C", "text": "No players are boys"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('8ebdbf11-3567-4244-97ae-b3485eaa69ab', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All teachers are educated. Some educated people are writers.', 'mcq', 1, 74, TRUE, '{"options": [{"key": "A", "text": "All teachers are writers"}, {"key": "B", "text": "Some writers are teachers"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No teachers are writers"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('adbcf442-ae5c-4fc7-8ec1-8ef9bec98a15', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All dogs are animals. No animal is a plant. Conclusion?', 'mcq', 1, 75, TRUE, '{"options": [{"key": "A", "text": "No dog is a plant"}, {"key": "B", "text": "All plants are dogs"}, {"key": "C", "text": "Some dogs are plants"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('48f427e3-8490-486c-b8cf-a470ad7ba098', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All cars have wheels. A car is a vehicle. Conclusion?', 'mcq', 1, 76, TRUE, '{"options": [{"key": "A", "text": "All vehicles have wheels"}, {"key": "B", "text": "Some vehicles have wheels"}, {"key": "C", "text": "No vehicles have wheels"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c8e09d00-e6e2-4bbf-9e74-73186b239404', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All pencils are stationery. All stationery are useful.', 'mcq', 1, 77, TRUE, '{"options": [{"key": "A", "text": "All pencils are useful"}, {"key": "B", "text": "Some pencils are useful"}, {"key": "C", "text": "No pencils are useful"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('03768adf-5929-4b22-8a4c-32012722f0f0', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Some students are athletes.', 'mcq', 1, 78, TRUE, '{"options": [{"key": "A", "text": "All athletes are students"}, {"key": "B", "text": "Some athletes are students"}, {"key": "C", "text": "No athletes are students"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('4328369d-5eae-4cb6-9f3b-388659464349', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All books are papers. All papers are recyclable.', 'mcq', 1, 79, TRUE, '{"options": [{"key": "A", "text": "All books are recyclable"}, {"key": "B", "text": "Some books are recyclable"}, {"key": "C", "text": "No books are recyclable"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1a4c178e-0dae-4872-a41e-8c6b1f4e799a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next number: 3, 7, 15, 31, 63, ?', 'mcq', 1, 80, TRUE, '{"options": [{"key": "A", "text": "95"}, {"key": "B", "text": "127"}, {"key": "C", "text": "128"}, {"key": "D", "text": "131"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c49503a6-6f02-40cf-b27a-37ee27aa7db4', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If TABLE is coded as UBCMF, then CHAIR is coded as:', 'mcq', 1, 81, TRUE, '{"options": [{"key": "A", "text": "DIBJS"}, {"key": "B", "text": "DIBJR"}, {"key": "C", "text": "EJCJS"}, {"key": "D", "text": "DHCJR"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b51b1852-9a91-4ece-9ec2-568698139194', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which word does not belong to the group?', 'mcq', 1, 82, TRUE, '{"options": [{"key": "A", "text": "Doctor"}, {"key": "B", "text": "Nurse"}, {"key": "C", "text": "Teacher"}, {"key": "D", "text": "Hospital"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('0fa73a74-d9ae-4fe0-b88a-8d2fd3a45510', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A is taller than B. B is taller than C. Who is the shortest?', 'mcq', 1, 83, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('59725221-56c0-4fa8-ba5e-16a957125f32', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next letter: A, C, E, G, ?', 'mcq', 1, 84, TRUE, '{"options": [{"key": "A", "text": "H"}, {"key": "B", "text": "I"}, {"key": "C", "text": "J"}, {"key": "D", "text": "K"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b6d3e2ee-9196-4200-a7dc-e581342c07ef', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If SOUTH is written as HTUOS, then NORTH is written as:', 'mcq', 1, 85, TRUE, '{"options": [{"key": "A", "text": "HTRON"}, {"key": "B", "text": "NROTH"}, {"key": "C", "text": "HTRNO"}, {"key": "D", "text": "OTRHN"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('13bc1b97-aa1c-4161-810d-b838c790b0ae', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which number is missing? 4, 9, 16, 25, ?, 49', 'mcq', 1, 86, TRUE, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "35"}, {"key": "C", "text": "36"}, {"key": "D", "text": "40"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('921baedc-2e5f-43d2-9ccf-7aed6337d730', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If all pens are books and all books are bags, then all pens are:', 'mcq', 1, 87, TRUE, '{"options": [{"key": "A", "text": "Bags"}, {"key": "B", "text": "Books only"}, {"key": "C", "text": "Bags and books"}, {"key": "D", "text": "None"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1dc9a6b8-da7c-433c-aa46-495ba2e115fb', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd one out:', 'mcq', 1, 88, TRUE, '{"options": [{"key": "A", "text": "8"}, {"key": "B", "text": "27"}, {"key": "C", "text": "64"}, {"key": "D", "text": "81"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('b476b925-9678-4f76-aef7-459d4eddc96e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A clock shows 3:00. What is the angle between the hands?', 'mcq', 1, 89, TRUE, '{"options": [{"key": "A", "text": "60°"}, {"key": "B", "text": "75°"}, {"key": "C", "text": "90°"}, {"key": "D", "text": "120°"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('e4d236c6-8281-457c-b5db-af3e53244648', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If CAT = 24 and DOG = 26, then BAT = ?', 'mcq', 1, 90, TRUE, '{"options": [{"key": "A", "text": "22"}, {"key": "B", "text": "23"}, {"key": "C", "text": "24"}, {"key": "D", "text": "25"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('1affb218-d733-43d0-bbbd-5ceb6e36ee86', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Pointing to a woman, Raj says, "She is the daughter of my mother''s only daughter." How is the woman related to Raj?', 'mcq', 1, 91, TRUE, '{"options": [{"key": "A", "text": "Sister"}, {"key": "B", "text": "Daughter"}, {"key": "C", "text": "Niece"}, {"key": "D", "text": "Cousin"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('9039f4f0-038f-4df2-982d-44aa07ae8669', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the next number: 2, 6, 12, 20, 30, ?', 'mcq', 1, 92, TRUE, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('955f2f61-9649-4495-a2c1-e66cee3c2380', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Which pair has the same relationship? Bird : Fly', 'mcq', 1, 93, TRUE, '{"options": [{"key": "A", "text": "Fish : Swim"}, {"key": "B", "text": "Dog : Bark"}, {"key": "C", "text": "Cow : Milk"}, {"key": "D", "text": "Cat : Pet"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('d13ad836-5822-45d4-984f-6e4cc35f6f1e', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'A man walks 5 km East, then 5 km North. In which direction is he from the starting point?', 'mcq', 1, 94, TRUE, '{"options": [{"key": "A", "text": "North-East"}, {"key": "B", "text": "South-East"}, {"key": "C", "text": "North-West"}, {"key": "D", "text": "West"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('c5d79d94-c437-497c-93b8-a063daa6732c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Find the odd one:', 'mcq', 1, 95, TRUE, '{"options": [{"key": "A", "text": "Monday"}, {"key": "B", "text": "Wednesday"}, {"key": "C", "text": "Friday"}, {"key": "D", "text": "January"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('7733e170-0792-42c7-b051-d1c10d9fa5ec', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'If PENCIL is coded as QFODJM, then ERASER is coded as:', 'mcq', 1, 96, TRUE, '{"options": [{"key": "A", "text": "FSBTFS"}, {"key": "B", "text": "GSBTFS"}, {"key": "C", "text": "FSCTFS"}, {"key": "D", "text": "GSBUFS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('aa5d4e92-59e4-4e4b-8ec5-da368e6bcd5c', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'All roses are flowers. Some flowers are yellow. Which conclusion follows?', 'mcq', 1, 97, TRUE, '{"options": [{"key": "A", "text": "All roses are yellow"}, {"key": "B", "text": "Some roses are yellow"}, {"key": "C", "text": "No rose is yellow"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('99c40ac6-3630-43bc-b9ad-9a6ea1891c8a', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Complete the series: Z, X, V, T, ?', 'mcq', 1, 98, TRUE, '{"options": [{"key": "A", "text": "R"}, {"key": "B", "text": "Q"}, {"key": "C", "text": "P"}, {"key": "D", "text": "S"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, is_required, config, created_at)
VALUES ('5db9bda2-5ee7-415b-aece-ce4a207e2835', '48d0eca9-831a-4761-af47-f7a9e0251135', 'a582d20b-3152-4dbc-8d3b-8cd6b1bfc96d', 'Five friends A, B, C, D, and E are sitting in a row. A is to the left of B, and C is to the right of B. Who is in the middle among A, B, and C?', 'mcq', 1, 99, TRUE, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot determine"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verification (run after migration):
-- SELECT s.title, COUNT(q.id) FROM test_sections s
--   LEFT JOIN test_questions q ON q.section_id = s.id
--   WHERE s.test_id = '48d0eca9-831a-4761-af47-f7a9e0251135'
--   GROUP BY s.title ORDER BY s.title;
-- Expected: Section A = 100, Section B = 100, Section C = 100
