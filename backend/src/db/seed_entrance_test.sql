-- ============================================================
-- DY Patil Entrance Test — seed data
-- Sections: A(100q) B(100q) C(70q) = 270 questions
-- ============================================================

BEGIN;

-- Test
INSERT INTO tests (id, course_id, title, description, instructions, duration_minutes, total_marks, passing_marks, status, created_at, updated_at)
VALUES (
  '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7',
  NULL,
  'DY Patil PhD Entrance Examination',
  'Entrance examination for PhD admissions at DY Patil Research Institute.',
  'This exam consists of 3 sections totalling 270 questions.
Section A: English Assessment (100 questions)
Section B: Research Aptitude (100 questions)
Section C: Logical Reasoning (70 questions)
Duration: 90 minutes. Each question carries 1 mark. No negative marking.
Read all questions carefully. Choose the most appropriate answer.
The exam must be completed once started.',
  90,
  270,
  108,
  'draft',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sections
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('fd3c3a01-b745-4b7f-891a-577f7b84ae95', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'Section A – English Assessment', 'Tests English language proficiency, grammar, and vocabulary.', 0, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('99b07f5e-e857-41b3-be9a-bc3c0711004b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'Section B – Research Aptitude', 'Tests understanding of research methods, design, and analysis.', 1, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_sections (id, test_id, title, description, order_index, created_at)
VALUES ('0e82764e-9c72-4587-beb1-0d8bd9cf5204', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'Section C – Logical Reasoning', 'Tests pattern recognition, analogies, and logical inference.', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- Questions
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('45281325-3d8a-49f0-a4e2-9e1f8ad34b2c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is a noun?', 'mcq', 1, 0, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('eb6811fc-03aa-4a7d-b043-4f2af6cd5695', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences is correct?', 'mcq', 1, 1, '{"options": [{"key": "A", "text": "He can sings well."}, {"key": "B", "text": "He can sing well."}, {"key": "C", "text": "He can sing good."}, {"key": "D", "text": "He can sang well."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4058b61f-9ef7-4ca0-b7a4-090e7fa488d1', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct form of the verb: "She _____ to school every day."', 'mcq', 1, 2, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d7e5abbd-1d85-45d7-86f7-6ae4fd54d8d6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the past tense of "eat"?', 'mcq', 1, 3, '{"options": [{"key": "A", "text": "Ate"}, {"key": "B", "text": "Eaten"}, {"key": "C", "text": "Eating"}, {"key": "D", "text": "Eats"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('09726413-3a60-4145-8842-22b4a89993fa', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses a correct preposition?', 'mcq', 1, 4, '{"options": [{"key": "A", "text": "She is on the table."}, {"key": "B", "text": "She is at the table."}, {"key": "C", "text": "She is in the table."}, {"key": "D", "text": "She is by the table."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a6393864-5139-489d-a255-7e69225b6b39', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct article: "____ apple a day keeps the doctor away."', 'mcq', 1, 5, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "An"}, {"key": "C", "text": "The"}, {"key": "D", "text": "No article"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('547be38d-3f92-47a7-86dd-a9ee962a9e6a', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an adjective?', 'mcq', 1, 6, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quick"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Running"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b65614bc-88c9-4c4c-bda9-59266f444e4d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these is the correct plural form?', 'mcq', 1, 7, '{"options": [{"key": "A", "text": "Mouses"}, {"key": "B", "text": "Mice"}, {"key": "C", "text": "Mices"}, {"key": "D", "text": "Mouse"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2eb92dd6-6c42-429b-960e-4a757915d734', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the correct form of the sentence?', 'mcq', 1, 8, '{"options": [{"key": "A", "text": "They don''t plays football."}, {"key": "B", "text": "They don''t play football."}, {"key": "C", "text": "They don''t playing football."}, {"key": "D", "text": "They don''t played football."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('edd6a81e-5118-4884-8491-91a39b7f38b5', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the future tense?', 'mcq', 1, 9, '{"options": [{"key": "A", "text": "I eat breakfast at 8 am."}, {"key": "B", "text": "I will eat breakfast at 8 am."}, {"key": "C", "text": "I am eating breakfast at 8 am."}, {"key": "D", "text": "I ate breakfast at 8 am."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e8238534-fec9-40ff-a008-28400e8b18d3', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following words is an adverb?', 'mcq', 1, 10, '{"options": [{"key": "A", "text": "Run"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Happy"}, {"key": "D", "text": "Red"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('8530aa74-1c65-4c11-a232-297d4e3942ed', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which is a correct conjunction?', 'mcq', 1, 11, '{"options": [{"key": "A", "text": "And"}, {"key": "B", "text": "Slowly"}, {"key": "C", "text": "Walk"}, {"key": "D", "text": "Carefully"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1f733c6d-1ae7-4c55-a8d7-f854d316c404', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct form: "I _____ to the store yesterday."', 'mcq', 1, 12, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Went"}, {"key": "C", "text": "Going"}, {"key": "D", "text": "Gone"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b22023dd-7a50-44ad-a238-2d8ebd16c367', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the correct form of the sentence?', 'mcq', 1, 13, '{"options": [{"key": "A", "text": "She can speaks English."}, {"key": "B", "text": "She can speak English."}, {"key": "C", "text": "She can speaking English."}, {"key": "D", "text": "She can spoken English."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('54668020-92d4-4fcd-a74a-1e80e631d8c7', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is an example of indirect speech?', 'mcq', 1, 14, '{"options": [{"key": "A", "text": "He says, \"I am going to the market.\""}, {"key": "B", "text": "He says he is going to the market."}, {"key": "C", "text": "He is going to the market."}, {"key": "D", "text": "He said, \"I am going to the market.\""}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0e55a151-0bbf-4b06-bba5-0fab79eb36bd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a pronoun?', 'mcq', 1, 15, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "I"}, {"key": "C", "text": "Talk"}, {"key": "D", "text": "House"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('67156a5a-b18e-489a-a668-283ed81bbfa6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is written in the passive voice?', 'mcq', 1, 16, '{"options": [{"key": "A", "text": "He eats an apple."}, {"key": "B", "text": "An apple is eaten by him."}, {"key": "C", "text": "He is eating an apple."}, {"key": "D", "text": "He will eat an apple."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a5bb59c6-99d4-4581-b99d-513478b523fa', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is an antonym of "happy"?', 'mcq', 1, 17, '{"options": [{"key": "A", "text": "Joyful"}, {"key": "B", "text": "Sad"}, {"key": "C", "text": "Excited"}, {"key": "D", "text": "Cheerful"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6d00a0da-285b-4583-993f-4aa732a7dea0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct sentence:', 'mcq', 1, 18, '{"options": [{"key": "A", "text": "I don''t have no money."}, {"key": "B", "text": "I don''t have any money."}, {"key": "C", "text": "I don''t has any money."}, {"key": "D", "text": "I no have money."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('32a8a24d-77e6-423b-844e-f89458674594', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence contains a possessive noun?', 'mcq', 1, 19, '{"options": [{"key": "A", "text": "The dog runs fast."}, {"key": "B", "text": "The dog''s bone is on the floor."}, {"key": "C", "text": "The dogs run fast."}, {"key": "D", "text": "I like dogs."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('72dc01bb-7aeb-48e1-b342-3d147902ae08', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses the word "there" correctly?', 'mcq', 1, 20, '{"options": [{"key": "A", "text": "Their going to the park."}, {"key": "B", "text": "There is a book on the table."}, {"key": "C", "text": "I will go their soon."}, {"key": "D", "text": "I don''t like there attitude."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('71be06d8-366d-4344-b7ac-ff2fc6d1778f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is a compound sentence?', 'mcq', 1, 21, '{"options": [{"key": "A", "text": "She sings beautifully."}, {"key": "B", "text": "He likes apples, but she likes oranges."}, {"key": "C", "text": "They are students."}, {"key": "D", "text": "I am tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a1973f1b-70a6-4778-a2f1-4bd79b17eb86', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which is a correct question form?', 'mcq', 1, 22, '{"options": [{"key": "A", "text": "She is going where?"}, {"key": "B", "text": "Where is she going?"}, {"key": "C", "text": "She where is going?"}, {"key": "D", "text": "Going where she is?"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('37dc9647-0cf8-4346-9ff2-29df83046311', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these is a correct sentence in past perfect tense?', 'mcq', 1, 23, '{"options": [{"key": "A", "text": "She had finished her work."}, {"key": "B", "text": "She finished her work."}, {"key": "C", "text": "She finishes her work."}, {"key": "D", "text": "She is finishing her work."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ee541d8c-4090-4acb-90b9-7dced01e5738', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following words is a verb?', 'mcq', 1, 24, '{"options": [{"key": "A", "text": "Dog"}, {"key": "B", "text": "Quickly"}, {"key": "C", "text": "Run"}, {"key": "D", "text": "Beautiful"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('dc7e0958-c5b0-4435-88ae-71397b8e4496', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is the subject in the sentence: "The cat sleeps on the mat"?', 'mcq', 1, 25, '{"options": [{"key": "A", "text": "Cat"}, {"key": "B", "text": "Sleeps"}, {"key": "C", "text": "Mat"}, {"key": "D", "text": "On"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('31773180-56e0-4bff-9626-6b00d12b91ee', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is the object in the sentence: "She writes a letter"?', 'mcq', 1, 26, '{"options": [{"key": "A", "text": "She"}, {"key": "B", "text": "Writes"}, {"key": "C", "text": "Letter"}, {"key": "D", "text": "A"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7b1a4b3f-f0b9-47e3-bee9-5f4a3671a95b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct sentence:', 'mcq', 1, 27, '{"options": [{"key": "A", "text": "He can to swim."}, {"key": "B", "text": "He can swimming."}, {"key": "C", "text": "He can swim."}, {"key": "D", "text": "He swim can."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('048c7af8-beff-4812-aa06-0d12c415c336', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which is a correct form of the verb "to be"?', 'mcq', 1, 28, '{"options": [{"key": "A", "text": "I am going to the store."}, {"key": "B", "text": "I are going to the store."}, {"key": "C", "text": "I be going to the store."}, {"key": "D", "text": "I going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('32526904-f360-4e6e-829a-23e80acba39c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the superlative form of "big"?', 'mcq', 1, 29, '{"options": [{"key": "A", "text": "Bigger"}, {"key": "B", "text": "Biggest"}, {"key": "C", "text": "More big"}, {"key": "D", "text": "Biggestest"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('88480cf5-42c7-432f-a768-6d21274bc6df', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is a sentence with a modal verb?', 'mcq', 1, 30, '{"options": [{"key": "A", "text": "She likes ice cream."}, {"key": "B", "text": "I can swim."}, {"key": "C", "text": "He eats vegetables."}, {"key": "D", "text": "They are reading."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5bec6ac3-2d65-45f2-a76a-0682883d4485', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences is in the present continuous tense?', 'mcq', 1, 31, '{"options": [{"key": "A", "text": "I am writing a letter."}, {"key": "B", "text": "I wrote a letter."}, {"key": "C", "text": "I will write a letter."}, {"key": "D", "text": "I write a letter."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ec048005-a48a-4591-91c9-62e613547e3e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is the opposite of "easy"?', 'mcq', 1, 32, '{"options": [{"key": "A", "text": "Hard"}, {"key": "B", "text": "Difficult"}, {"key": "C", "text": "Simple"}, {"key": "D", "text": "Comfortable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e32b24bc-2d07-4572-b966-6472f19c5277', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What type of word is "happiness"?', 'mcq', 1, 33, '{"options": [{"key": "A", "text": "Verb"}, {"key": "B", "text": "Noun"}, {"key": "C", "text": "Adjective"}, {"key": "D", "text": "Pronoun"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('702aaa00-3ccd-4528-94a6-20b6934dcc4e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is the opposite of "light"?', 'mcq', 1, 34, '{"options": [{"key": "A", "text": "Bright"}, {"key": "B", "text": "Heavy"}, {"key": "C", "text": "Soft"}, {"key": "D", "text": "Strong"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7ee6beaf-a28f-4f0e-a78a-d31ba14e2d48', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the past progressive tense?', 'mcq', 1, 35, '{"options": [{"key": "A", "text": "She was running yesterday."}, {"key": "B", "text": "She runs yesterday."}, {"key": "C", "text": "She is running yesterday."}, {"key": "D", "text": "She ran yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7447eb9a-16dc-4614-96ec-0544b5751e54', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a declarative sentence?', 'mcq', 1, 36, '{"options": [{"key": "A", "text": "Are you coming?"}, {"key": "B", "text": "Please sit down."}, {"key": "C", "text": "She is reading."}, {"key": "D", "text": "What is your name?"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6cd14bf5-68d0-4e6d-84df-c3fd3ade9736', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the correct conditional form?', 'mcq', 1, 37, '{"options": [{"key": "A", "text": "If I was you, I would help."}, {"key": "B", "text": "If I am you, I would help."}, {"key": "C", "text": "If I were you, I would help."}, {"key": "D", "text": "If I was you, I will help."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('600e51f7-95a1-4585-8346-37609825e9fa', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences uses an interrogative pronoun?', 'mcq', 1, 38, '{"options": [{"key": "A", "text": "Who is coming to the party?"}, {"key": "B", "text": "She is coming to the party."}, {"key": "C", "text": "This is coming to the party."}, {"key": "D", "text": "I am coming to the party."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7a6c23a0-f427-4a11-8cf7-d1446ffdb595', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a conjunction?', 'mcq', 1, 39, '{"options": [{"key": "A", "text": "Running"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Ball"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c19ef439-b669-4dc5-9b89-f54419f5a5f7', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the present perfect tense?', 'mcq', 1, 40, '{"options": [{"key": "A", "text": "He has finished his homework."}, {"key": "B", "text": "He finishes his homework."}, {"key": "C", "text": "He is finishing his homework."}, {"key": "D", "text": "He finished his homework."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c022a5d5-e332-4b34-8bac-39eff74dfecf', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the correct sentence?', 'mcq', 1, 41, '{"options": [{"key": "A", "text": "I have visited to the park."}, {"key": "B", "text": "I have visited the park."}, {"key": "C", "text": "I visited have the park."}, {"key": "D", "text": "I visited to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b4bf7ecc-f59e-4426-b8f3-b434b0f338e0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in passive voice?', 'mcq', 1, 42, '{"options": [{"key": "A", "text": "The teacher teaches the students."}, {"key": "B", "text": "The students are taught by the teacher."}, {"key": "C", "text": "The teacher is teaching the students."}, {"key": "D", "text": "The teacher teaches."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('dd04a29e-b43a-469e-a43f-652acf38ca7d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a complex sentence?', 'mcq', 1, 43, '{"options": [{"key": "A", "text": "She is going to the store, and he is going to the park."}, {"key": "B", "text": "He went to the store."}, {"key": "C", "text": "After I finish my homework, I will go to the store."}, {"key": "D", "text": "I am tired."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4fa62ae4-806c-4135-91f8-f3c338d10cf9', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the plural form of "child"?', 'mcq', 1, 44, '{"options": [{"key": "A", "text": "Childs"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childrens"}, {"key": "D", "text": "Childes"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3b0dc586-0114-4934-9753-c4d9560adadc', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses "whose" correctly?', 'mcq', 1, 45, '{"options": [{"key": "A", "text": "Whose book is this?"}, {"key": "B", "text": "Whose are you going?"}, {"key": "C", "text": "Whose your favorite color?"}, {"key": "D", "text": "Whose did you go to?"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f570f678-4c5e-48b3-9b21-94030d0350e3', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences contains an adjective?', 'mcq', 1, 46, '{"options": [{"key": "A", "text": "She runs quickly."}, {"key": "B", "text": "She is very happy."}, {"key": "C", "text": "She runs every day."}, {"key": "D", "text": "She is going home."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6019b0dc-4c2a-4d2e-829a-22c71603ee7e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is the opposite of "hard"?', 'mcq', 1, 47, '{"options": [{"key": "A", "text": "Soft"}, {"key": "B", "text": "Tough"}, {"key": "C", "text": "Heavy"}, {"key": "D", "text": "Strong"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fe89eddf-f067-494d-895e-07850b607036', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Choose the correct comparative form of "good".', 'mcq', 1, 48, '{"options": [{"key": "A", "text": "Better"}, {"key": "B", "text": "Gooder"}, {"key": "C", "text": "Best"}, {"key": "D", "text": "Weller"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a891f498-b01c-4c47-8b3e-65132ef0d202', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the correct possessive form of "Tom"?', 'mcq', 1, 49, '{"options": [{"key": "A", "text": "Toms''"}, {"key": "B", "text": "Tom''s"}, {"key": "C", "text": "Tomes"}, {"key": "D", "text": "Tom"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ac9cc1e3-5822-4a36-8298-c79e99c2cdbc', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the past continuous tense?', 'mcq', 1, 50, '{"options": [{"key": "A", "text": "He was playing soccer."}, {"key": "B", "text": "He plays soccer."}, {"key": "C", "text": "He played soccer."}, {"key": "D", "text": "He is playing soccer."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('01147981-ff69-4e37-8e41-bec85bb69681', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is an adverb of manner?', 'mcq', 1, 51, '{"options": [{"key": "A", "text": "Always"}, {"key": "B", "text": "Carefully"}, {"key": "C", "text": "Tomorrow"}, {"key": "D", "text": "Here"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e42923e8-b153-4325-9678-cd37d7605196', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is a command?', 'mcq', 1, 52, '{"options": [{"key": "A", "text": "Do you like the movie?"}, {"key": "B", "text": "She likes the movie."}, {"key": "C", "text": "Please take your seat."}, {"key": "D", "text": "I like the movie."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b84b6441-02cd-49cc-9df0-176d28fc2bc8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the synonym of "beautiful"?', 'mcq', 1, 53, '{"options": [{"key": "A", "text": "Ugly"}, {"key": "B", "text": "Pretty"}, {"key": "C", "text": "Strong"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3895f829-3534-4c5b-9b52-1201d8fc2e19', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is a question?', 'mcq', 1, 54, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "Where are you?"}, {"key": "C", "text": "I am tired."}, {"key": "D", "text": "I like to read books."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('81de30f4-e783-4e23-8546-4efc1d67f263', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a preposition?', 'mcq', 1, 55, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Under"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Run"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1feb52af-1575-4d4b-afcc-4dfee9751fa6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses "to" as part of the infinitive form?', 'mcq', 1, 56, '{"options": [{"key": "A", "text": "I like to read books."}, {"key": "B", "text": "I am going to read books."}, {"key": "C", "text": "He likes reading books."}, {"key": "D", "text": "She is reading a book."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e72e49f8-3550-4bb4-bcfb-7f8e7a3b4c54', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a simple sentence?', 'mcq', 1, 57, '{"options": [{"key": "A", "text": "I like coffee and I like tea."}, {"key": "B", "text": "He went to the store because he needed milk."}, {"key": "C", "text": "She reads books every day."}, {"key": "D", "text": "Although she was tired, she went to the gym."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('990ee577-e600-42a9-ae09-d1796d56d5a8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is an interjection?', 'mcq', 1, 58, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Oh!"}, {"key": "C", "text": "Book"}, {"key": "D", "text": "Happy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4271f440-18e9-419c-a0ec-4452361ca8ff', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is the correct plural form of "fox"?', 'mcq', 1, 59, '{"options": [{"key": "A", "text": "Foxes"}, {"key": "B", "text": "Foxs"}, {"key": "C", "text": "Foxes''"}, {"key": "D", "text": "Foxs''"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('eeffd7e1-d5b8-4a05-8b3b-b16757fb7450', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the correct form of the verb "to go" in the past tense?', 'mcq', 1, 60, '{"options": [{"key": "A", "text": "Go"}, {"key": "B", "text": "Goes"}, {"key": "C", "text": "Went"}, {"key": "D", "text": "Going"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4dcf6cfd-167c-419c-9bdf-bbf6b968756c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the future continuous tense?', 'mcq', 1, 61, '{"options": [{"key": "A", "text": "I will be studying tomorrow."}, {"key": "B", "text": "I study every day."}, {"key": "C", "text": "I will study tomorrow."}, {"key": "D", "text": "I studied yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f7211de0-3b25-4bf4-8486-454c077549cb', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence contains a subordinating conjunction?', 'mcq', 1, 62, '{"options": [{"key": "A", "text": "I am tired because I worked all day."}, {"key": "B", "text": "I went to the park, and I saw a dog."}, {"key": "C", "text": "I like coffee, but I prefer tea."}, {"key": "D", "text": "I ran quickly."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5d223418-1302-4ce4-8028-44af8b846f7c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is a possessive pronoun?', 'mcq', 1, 63, '{"options": [{"key": "A", "text": "Yours"}, {"key": "B", "text": "You"}, {"key": "C", "text": "He"}, {"key": "D", "text": "She"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4a207c2f-774c-41c9-b1a7-62335f874aae', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these sentences uses a comparative adjective?', 'mcq', 1, 64, '{"options": [{"key": "A", "text": "She is the fastest runner."}, {"key": "B", "text": "She is running faster than me."}, {"key": "C", "text": "She is a fast runner."}, {"key": "D", "text": "She runs fast."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a5f320ab-6f26-467c-80f7-19aa70e2d185', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is an example of direct speech?', 'mcq', 1, 65, '{"options": [{"key": "A", "text": "He said he was tired."}, {"key": "B", "text": "He said, \"I am tired.\""}, {"key": "C", "text": "He is tired, he said."}, {"key": "D", "text": "He said that he was tired."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5899cd78-67e6-44b5-9245-3533cda10c2c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses the correct verb tense?', 'mcq', 1, 66, '{"options": [{"key": "A", "text": "She had gone to the store."}, {"key": "B", "text": "She gone to the store."}, {"key": "C", "text": "She have gone to the store."}, {"key": "D", "text": "She going to the store."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('de8d57ed-f8fd-4229-90bd-948dcbfe99e7', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a synonym for "intelligent"?', 'mcq', 1, 67, '{"options": [{"key": "A", "text": "Smart"}, {"key": "B", "text": "Strong"}, {"key": "C", "text": "Angry"}, {"key": "D", "text": "Tired"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fbe166e9-32cd-41ec-9656-c512315a88ce', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses the word "then" correctly?', 'mcq', 1, 68, '{"options": [{"key": "A", "text": "First I will study, then I will go to bed."}, {"key": "B", "text": "Then I will study first, then I will go to bed."}, {"key": "C", "text": "I will then bed go."}, {"key": "D", "text": "I will study then."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5b09f08f-f660-49f5-8beb-f17b2845694c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences is in the past perfect tense?', 'mcq', 1, 69, '{"options": [{"key": "A", "text": "I had finished my homework before dinner."}, {"key": "B", "text": "I finished my homework before dinner."}, {"key": "C", "text": "I will finish my homework before dinner."}, {"key": "D", "text": "I am finishing my homework before dinner."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4418a29e-02d5-4578-a4ce-2dcbe49ad172', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is a demonstrative pronoun?', 'mcq', 1, 70, '{"options": [{"key": "A", "text": "This"}, {"key": "B", "text": "She"}, {"key": "C", "text": "You"}, {"key": "D", "text": "He"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9ffcc9c1-5665-40cf-aeee-dc9e8d1c5dfe', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the correct conditional form?', 'mcq', 1, 71, '{"options": [{"key": "A", "text": "If I was rich, I would travel the world."}, {"key": "B", "text": "If I am rich, I will travel the world."}, {"key": "C", "text": "If I were rich, I would travel the world."}, {"key": "D", "text": "If I were rich, I will travel the world."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('355b9535-b1eb-461f-8727-f5f02b85634f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses the word "who" correctly?', 'mcq', 1, 72, '{"options": [{"key": "A", "text": "Who are you coming with?"}, {"key": "B", "text": "Who is going to the store?"}, {"key": "C", "text": "I know who she is."}, {"key": "D", "text": "All of the above"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f1384698-ae24-4fcc-ab24-ad49048dcd16', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a compound-complex sentence?', 'mcq', 1, 73, '{"options": [{"key": "A", "text": "I went to the store, and I bought some milk."}, {"key": "B", "text": "After I finished my homework, I went to bed, and I slept well."}, {"key": "C", "text": "She likes to read books."}, {"key": "D", "text": "I like pizza, but I don\u2019t like pasta."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b47b97b5-b3ff-4375-95b5-a50d2afa833e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a conjunction?', 'mcq', 1, 74, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Or"}, {"key": "C", "text": "Car"}, {"key": "D", "text": "Dog"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d0b6f12e-a843-4722-a826-d8baca8d9143', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences is in the past simple tense?', 'mcq', 1, 75, '{"options": [{"key": "A", "text": "He is eating lunch."}, {"key": "B", "text": "He ate lunch."}, {"key": "C", "text": "He was eating lunch."}, {"key": "D", "text": "He will eat lunch."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('907c9e8d-0f6a-4a0f-9830-41b3fb9d89b6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a negative sentence?', 'mcq', 1, 76, '{"options": [{"key": "A", "text": "She can swim."}, {"key": "B", "text": "She cannot swim."}, {"key": "C", "text": "She swims."}, {"key": "D", "text": "She is swimming."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('607cd72c-937d-4a80-86f8-277eca12595f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses "they''re" correctly?', 'mcq', 1, 77, '{"options": [{"key": "A", "text": "Theyre going to the store."}, {"key": "B", "text": "They''re going to the store."}, {"key": "C", "text": "There going to the store."}, {"key": "D", "text": "Their going to the store."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c39d5fb4-365e-46b5-9fe8-7275528c45ae', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a synonym of "angry"?', 'mcq', 1, 78, '{"options": [{"key": "A", "text": "Happy"}, {"key": "B", "text": "Mad"}, {"key": "C", "text": "Sad"}, {"key": "D", "text": "Excited"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a67b021a-5a8e-4b71-9cb8-96e0aca4dfef', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the past tense of "write"?', 'mcq', 1, 79, '{"options": [{"key": "A", "text": "Wrote"}, {"key": "B", "text": "Written"}, {"key": "C", "text": "Write"}, {"key": "D", "text": "Writing"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d5abb4af-9800-4f34-82c4-c1c8bbfa345d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the correct order?', 'mcq', 1, 80, '{"options": [{"key": "A", "text": "She loves playing the piano."}, {"key": "B", "text": "She loves the playing piano."}, {"key": "C", "text": "Loves she playing the piano."}, {"key": "D", "text": "Playing the piano loves she."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f7f266e5-0bc3-4617-99cf-797fe6a15d77', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these words is an example of a preposition of place?', 'mcq', 1, 81, '{"options": [{"key": "A", "text": "After"}, {"key": "B", "text": "On"}, {"key": "C", "text": "Quickly"}, {"key": "D", "text": "Before"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('76dd0244-3f9f-43ea-aab6-e2e95522edbd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is written in the active voice?', 'mcq', 1, 82, '{"options": [{"key": "A", "text": "The book was read by her."}, {"key": "B", "text": "The book is being read by her."}, {"key": "C", "text": "She read the book."}, {"key": "D", "text": "The book will be read by her."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5c6b0550-4718-4910-bb39-b57b80be33c4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is an example of a compound sentence?', 'mcq', 1, 83, '{"options": [{"key": "A", "text": "I want to go to the store, but I don\u2019t have enough money."}, {"key": "B", "text": "I like pizza."}, {"key": "C", "text": "Although I am tired, I went to the gym."}, {"key": "D", "text": "She sings well."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('8718402a-e4b2-4e02-96e6-62c24e620312', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence contains an adjective clause?', 'mcq', 1, 84, '{"options": [{"key": "A", "text": "The girl who sings is my sister."}, {"key": "B", "text": "The girl sings."}, {"key": "C", "text": "She is my sister."}, {"key": "D", "text": "The girl sings beautifully."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2a44cc1c-9ea8-428b-a697-f9b45123b7ed', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following sentences uses an object pronoun?', 'mcq', 1, 85, '{"options": [{"key": "A", "text": "She is my friend."}, {"key": "B", "text": "I gave him the book."}, {"key": "C", "text": "She likes reading."}, {"key": "D", "text": "I like her."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('54b52dd3-718c-4752-8a27-d9a1c8fafa23', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these is the correct plural form of "city"?', 'mcq', 1, 86, '{"options": [{"key": "A", "text": "Citie"}, {"key": "B", "text": "Cities"}, {"key": "C", "text": "Citys"}, {"key": "D", "text": "Citis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fd50aef1-3bcb-49dc-be00-cc6d85bdaf52', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the possessive form of "cat"?', 'mcq', 1, 87, '{"options": [{"key": "A", "text": "Cats''"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Cat''s"}, {"key": "D", "text": "Cats"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('774f0a98-0c87-467b-91b6-e6ee48bb330b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these sentences is correct?', 'mcq', 1, 88, '{"options": [{"key": "A", "text": "He can singing well."}, {"key": "B", "text": "He sings well."}, {"key": "C", "text": "He singing well."}, {"key": "D", "text": "He can sing well."}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d10fa932-7d00-42eb-b4ed-fca1d9cb1db0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these words is a noun?', 'mcq', 1, 89, '{"options": [{"key": "A", "text": "Quickly"}, {"key": "B", "text": "Jump"}, {"key": "C", "text": "Happiness"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4e1b85ab-e419-4d82-994d-cec1d4f87bc0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the past perfect continuous tense?', 'mcq', 1, 90, '{"options": [{"key": "A", "text": "I had been waiting for an hour."}, {"key": "B", "text": "I was waiting for an hour."}, {"key": "C", "text": "I waited for an hour."}, {"key": "D", "text": "I have been waiting for an hour."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4b286a0b-3ac2-4759-9c7d-15e3d19d7513', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the present continuous tense?', 'mcq', 1, 91, '{"options": [{"key": "A", "text": "I am eating lunch."}, {"key": "B", "text": "I eat lunch every day."}, {"key": "C", "text": "I will eat lunch tomorrow."}, {"key": "D", "text": "I ate lunch yesterday."}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7ea00be5-18f3-4300-9a9d-816ad1e85603', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these words is an adjective?', 'mcq', 1, 92, '{"options": [{"key": "A", "text": "Happily"}, {"key": "B", "text": "Happiness"}, {"key": "C", "text": "Bright"}, {"key": "D", "text": "Run"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fb020f7e-d8ad-48fd-a8b7-fae926e1f84b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of the following is the correct contraction for "they are"?', 'mcq', 1, 93, '{"options": [{"key": "A", "text": "Theyre"}, {"key": "B", "text": "They''re"}, {"key": "C", "text": "Theys"}, {"key": "D", "text": "They"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f2f1968c-69ce-46c9-af6f-365da7aaf699', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is a synonym of "start"?', 'mcq', 1, 94, '{"options": [{"key": "A", "text": "Begin"}, {"key": "B", "text": "End"}, {"key": "C", "text": "Finish"}, {"key": "D", "text": "Stop"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('444448ac-7f2e-47e5-94f4-8a9cb106beb1', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence uses "your" correctly?', 'mcq', 1, 95, '{"options": [{"key": "A", "text": "Your my friend."}, {"key": "B", "text": "Your going to the store."}, {"key": "C", "text": "Is this your book?"}, {"key": "D", "text": "Youre my friend."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4664660a-8e44-4019-b3b7-433d82a5bdc4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which word is an antonym of "hot"?', 'mcq', 1, 96, '{"options": [{"key": "A", "text": "Warm"}, {"key": "B", "text": "Cold"}, {"key": "C", "text": "Boiling"}, {"key": "D", "text": "Spicy"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('007448e8-d331-4586-b5f7-5ecf9ffbc024', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which sentence is in the correct past tense form?', 'mcq', 1, 97, '{"options": [{"key": "A", "text": "He runs to school."}, {"key": "B", "text": "He run to school."}, {"key": "C", "text": "He ran to school."}, {"key": "D", "text": "He running to school."}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('85a09014-8549-426b-a712-07e789b07cfe', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'What is the proper plural form of "child"?', 'mcq', 1, 98, '{"options": [{"key": "A", "text": "Childrens"}, {"key": "B", "text": "Children"}, {"key": "C", "text": "Childs"}, {"key": "D", "text": "Childern"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('8466a8cb-e9b2-42d0-9e8b-ceeb8363fb63', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', 'fd3c3a01-b745-4b7f-891a-577f7b84ae95', 'Which of these sentences is a negative statement?', 'mcq', 1, 99, '{"options": [{"key": "A", "text": "I am going to the park."}, {"key": "B", "text": "I amnot going to the park."}, {"key": "C", "text": "I go to the park."}, {"key": "D", "text": "I will go to the park."}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c0d90024-9a50-4de7-b5a1-416284537156', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is the first step in the research process?', 'mcq', 1, 0, '{"options": [{"key": "A", "text": "Literature review"}, {"key": "B", "text": "Data collection"}, {"key": "C", "text": "Defining the research problem"}, {"key": "D", "text": "Hypothesis formulation"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('70e5004c-6fcd-49ea-b6b7-a489394be03e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a type of primary data collection method?', 'mcq', 1, 1, '{"options": [{"key": "A", "text": "Textbooks"}, {"key": "B", "text": "Surveys"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Published articles"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2ac7f971-ab9d-4a19-869e-a276fd961e12', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Sampling'' refer to in research?', 'mcq', 1, 2, '{"options": [{"key": "A", "text": "Collecting data from all subjects"}, {"key": "B", "text": "The technique used to select a sample"}, {"key": "C", "text": "Collecting data from secondary sources"}, {"key": "D", "text": "Analyzing the entire population"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e14cb88e-3347-40e4-9633-9ca854989732', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which sampling technique involves dividing a population into subgroups and selecting a sample from each subgroup?', 'mcq', 1, 3, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Cluster sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5c1ed0cb-94d2-48a0-a412-877b1a657450', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which research design focuses on establishing causal relationships between variables?', 'mcq', 1, 4, '{"options": [{"key": "A", "text": "Descriptive research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('28e2058d-5bec-4ad2-a361-d7f2ef75ad55', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'The term ''Variable'' refers to:', 'mcq', 1, 5, '{"options": [{"key": "A", "text": "A fixed characteristic in a study"}, {"key": "B", "text": "An element that can vary or change"}, {"key": "C", "text": "The sample used in research"}, {"key": "D", "text": "The research methodology"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('22cb9e4a-adfd-45da-8be7-aa18176fed9a', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Reliability'' in the context of research?', 'mcq', 1, 6, '{"options": [{"key": "A", "text": "The accuracy of the data"}, {"key": "B", "text": "The consistency of the measurement"}, {"key": "C", "text": "The depth of the study"}, {"key": "D", "text": "The bias in the research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7b570ea3-bf48-4760-8fb7-c05a4e74568e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'A hypothesis is:', 'mcq', 1, 7, '{"options": [{"key": "A", "text": "A theory"}, {"key": "B", "text": "A question to be answered"}, {"key": "C", "text": "A tentative assumption or proposition that can be tested"}, {"key": "D", "text": "A conclusion drawn from data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f52ef12b-5031-4fbe-ab00-13f5cd716fc5', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a characteristic of qualitative research?', 'mcq', 1, 8, '{"options": [{"key": "A", "text": "Numerical data analysis"}, {"key": "B", "text": "Statistical tests"}, {"key": "C", "text": "Focus on understanding meaning and experiences"}, {"key": "D", "text": "Large sample sizes"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('27302099-f72c-4682-b594-996d7ac7f9a0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'The method of research that involves detailed study of a single case is called:', 'mcq', 1, 9, '{"options": [{"key": "A", "text": "Survey research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Case study research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('570892bc-0a96-4016-afb2-9d532a4d6556', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the context of a research study, which of the following is known as ''The independent variable''?', 'mcq', 1, 10, '{"options": [{"key": "A", "text": "The variable that is manipulated or changed"}, {"key": "B", "text": "The outcome of interest"}, {"key": "C", "text": "The variable that remains constant"}, {"key": "D", "text": "The group being studied"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3d3734fd-6b15-490b-9946-00e8a9960746', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which type of data analysis is used to interpret numerical data?', 'mcq', 1, 11, '{"options": [{"key": "A", "text": "Thematic analysis"}, {"key": "B", "text": "Quantitative analysis"}, {"key": "C", "text": "Content analysis"}, {"key": "D", "text": "Narrative analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('96a0dbc9-5a9f-459f-b4c2-7566046ecf52', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of secondary data?', 'mcq', 1, 12, '{"options": [{"key": "A", "text": "Interview transcripts"}, {"key": "B", "text": "Survey responses"}, {"key": "C", "text": "Government reports"}, {"key": "D", "text": "Observation records"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('03ee7f6f-8bad-46cd-9ab8-a4d883da9675', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which research methodology uses unstructured data such as interviews, focus groups, and observations?', 'mcq', 1, 13, '{"options": [{"key": "A", "text": "Quantitative research"}, {"key": "B", "text": "Qualitative research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Correlational research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4127138a-ec2d-440d-b583-c921a8827d80', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a non-probability sampling technique?', 'mcq', 1, 14, '{"options": [{"key": "A", "text": "Stratified random sampling"}, {"key": "B", "text": "Simple random sampling"}, {"key": "C", "text": "Systematic sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('94fe74d0-a10a-405f-9ca6-8c3371b2df81', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'The term ''Literature review'' refers to:', 'mcq', 1, 15, '{"options": [{"key": "A", "text": "A detailed analysis of your findings"}, {"key": "B", "text": "A summary of previously published research"}, {"key": "C", "text": "A list of research questions"}, {"key": "D", "text": "A summary of the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('34bbf996-166e-48b8-8db7-7be5ef22498e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does a ''Descriptive'' research design aim to do?', 'mcq', 1, 16, '{"options": [{"key": "A", "text": "Predict future trends"}, {"key": "B", "text": "Determine cause-effect relationships"}, {"key": "C", "text": "Describe characteristics of a phenomenon"}, {"key": "D", "text": "Test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fab2579e-54e7-4f7f-9d86-a41f3af41829', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of a dependent variable?', 'mcq', 1, 17, '{"options": [{"key": "A", "text": "Age"}, {"key": "B", "text": "Gender"}, {"key": "C", "text": "Test scores"}, {"key": "D", "text": "Treatment conditions"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3186bd2d-64cf-4eba-8865-b95324869e82', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the ''Control group'' in an experimental design?', 'mcq', 1, 18, '{"options": [{"key": "A", "text": "The group that receives the treatment"}, {"key": "B", "text": "The group that is not exposed to the experimental treatment"}, {"key": "C", "text": "The group with the largest sample size"}, {"key": "D", "text": "The group selected randomly"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2bb317a9-7fc7-443c-a408-ccf12f3821f5', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In a research study, ''Ethics'' refers to:', 'mcq', 1, 19, '{"options": [{"key": "A", "text": "The methods used for data collection"}, {"key": "B", "text": "The ways in which data is analyzed"}, {"key": "C", "text": "The moral principles governing research conduct"}, {"key": "D", "text": "The number of participants in a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('33b0dc60-b4fe-4521-b8d7-bcf3a91cbfa1', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is NOT an example of a research instrument?', 'mcq', 1, 20, '{"options": [{"key": "A", "text": "Questionnaire"}, {"key": "B", "text": "Observation checklist"}, {"key": "C", "text": "Software tool for data analysis"}, {"key": "D", "text": "Theoretical framework"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3bd4b81a-cba9-4d05-84aa-c8209411d5dc', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a common statistical technique for analyzing relationships between two variables?', 'mcq', 1, 21, '{"options": [{"key": "A", "text": "Regression analysis"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "Factor analysis"}, {"key": "D", "text": "Ethnographic analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('18a6c4bf-32e9-4d3b-b1c2-05d0fc93f218', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the main purpose of an abstract in a research paper?', 'mcq', 1, 22, '{"options": [{"key": "A", "text": "To summarize the entire study"}, {"key": "B", "text": "To explain the methodology in detail"}, {"key": "C", "text": "To list all the references used"}, {"key": "D", "text": "To provide a detailed discussion of findings"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('86b5ab22-aed7-49c9-a0d9-b96f2b199576', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of qualitative data?', 'mcq', 1, 23, '{"options": [{"key": "A", "text": "Test scores"}, {"key": "B", "text": "Weight measurements"}, {"key": "C", "text": "Interview responses"}, {"key": "D", "text": "Blood pressure readings"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3dba07b3-e14b-49fe-8353-584c30ad9238', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is considered a strength of using surveys in research?', 'mcq', 1, 24, '{"options": [{"key": "A", "text": "They provide detailed, in-depth data"}, {"key": "B", "text": "They are cost-effective and allow data collection from large groups"}, {"key": "C", "text": "They are not influenced by researcher bias"}, {"key": "D", "text": "They do not require ethical considerations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1d655a27-9dfb-4488-8f31-b4deeb79d913', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'The term ''Validity'' refers to:', 'mcq', 1, 25, '{"options": [{"key": "A", "text": "The error of measurement"}, {"key": "B", "text": "The accuracy of the measurement"}, {"key": "C", "text": "The ability to repeat the experiment"}, {"key": "D", "text": "The extent to which results are real"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f6f3b030-0e0c-4f97-b02f-90a6e0882ac9', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which research method is based on structured observations and statistical tests?', 'mcq', 1, 26, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Quantitative research"}, {"key": "C", "text": "Ethnography"}, {"key": "D", "text": "Grounded theory"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1a96bf08-4b5f-4869-8cc3-56c29d59eec3', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Theoretical framework'' in a research study?', 'mcq', 1, 27, '{"options": [{"key": "A", "text": "A summary of the study\u2019s findings"}, {"key": "B", "text": "The foundation of theories on which the study is based"}, {"key": "C", "text": "The data collection tool used"}, {"key": "D", "text": "The statistical method employed"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d9d767e3-8197-42c4-9fff-62a95c1f8404', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Inferential statistics''?', 'mcq', 1, 28, '{"options": [{"key": "A", "text": "Mean"}, {"key": "B", "text": "Median"}, {"key": "C", "text": "Hypothesis testing"}, {"key": "D", "text": "Frequency distribution"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('dc706625-9c64-4342-b0c7-8e61a6aa1616', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which type of research uses a longitudinal approach, collecting data over an extended period of time?', 'mcq', 1, 29, '{"options": [{"key": "A", "text": "Cross-sectional research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Action research"}, {"key": "D", "text": "Longitudinal research"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9fe70bb5-3ec3-4d2a-85f4-972838e3b699', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the research process, ''Data analysis'' refers to:', 'mcq', 1, 30, '{"options": [{"key": "A", "text": "Writing the research report"}, {"key": "B", "text": "Organizing and interpreting the collected data"}, {"key": "C", "text": "Collecting data from participants"}, {"key": "D", "text": "Reviewing the literature"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a70b2c4f-e60d-4bb7-be6b-f81397bc8423', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of a qualitative research method?', 'mcq', 1, 31, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Experiments"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Statistical analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('214d9813-abfe-4bac-89f9-8f7dcbe7e6a4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'The ''P-value'' in hypothesis testing is used to:', 'mcq', 1, 32, '{"options": [{"key": "A", "text": "Measure the effect size"}, {"key": "B", "text": "Determine the likelihood that results are due to chance"}, {"key": "C", "text": "Estimate the sample size"}, {"key": "D", "text": "Summarize the data collected"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('370ef457-e863-4208-b3bf-5516cc315c4d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is NOT an ethical consideration in research?', 'mcq', 1, 33, '{"options": [{"key": "A", "text": "Confidentiality"}, {"key": "B", "text": "Informed consent"}, {"key": "C", "text": "Manipulating data"}, {"key": "D", "text": "Protection from harm"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5c3b7707-bb1d-4696-af0b-08c376cde8b2', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the role of the ''Literature Review'' in the research process?', 'mcq', 1, 34, '{"options": [{"key": "A", "text": "To describe the methodology used"}, {"key": "B", "text": "To identify gaps in existing research"}, {"key": "C", "text": "To summarize the data collected"}, {"key": "D", "text": "To discuss the results of the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a548eaa0-2f7b-4d7c-98ee-97d9cd1b4136', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the context of research, ''Ethnography'' is:', 'mcq', 1, 35, '{"options": [{"key": "A", "text": "The study of statistical data"}, {"key": "B", "text": "The analysis of cultural and social phenomena"}, {"key": "C", "text": "The observation of behaviors in controlled settings"}, {"key": "D", "text": "The analysis of numerical data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e2edae56-338d-47cc-8172-aab1713401b4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is NOT a characteristic of a well-defined research problem?', 'mcq', 1, 36, '{"options": [{"key": "A", "text": "It is clear and focused"}, {"key": "B", "text": "It is specific and researchable"}, {"key": "C", "text": "It is broad and vague"}, {"key": "D", "text": "It can be answered through data collection"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('61b808b6-0687-4b0a-b644-91a2ec3dbefd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a feature of a ''Cross-sectional'' study design?', 'mcq', 1, 37, '{"options": [{"key": "A", "text": "Data is collected at a single point in time"}, {"key": "B", "text": "Data is collected over a long period"}, {"key": "C", "text": "It manipulates variables to establish causality"}, {"key": "D", "text": "It focuses on qualitative analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5c0f72ed-74c9-4499-a9af-471c2921c40b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following describes ''Random sampling''?', 'mcq', 1, 38, '{"options": [{"key": "A", "text": "Selecting participants based on convenience"}, {"key": "B", "text": "Selecting participants who are easily accessible"}, {"key": "C", "text": "Selecting participants in such a way that every member has an equal chance of being chosen"}, {"key": "D", "text": "Selecting participants from specific groups"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7c089d5a-149a-43ca-aa78-8cdfdeced800', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of an extraneous variable in an experiment?', 'mcq', 1, 39, '{"options": [{"key": "A", "text": "The manipulated variable"}, {"key": "B", "text": "The outcome of the experiment"}, {"key": "C", "text": "A variable that could influence the dependent variable but is not of interest to the researcher"}, {"key": "D", "text": "The variable that is measured in the experiment"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4eb8f9b3-361c-4f68-8db0-6572bbfa28c0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Non-experimental research''?', 'mcq', 1, 40, '{"options": [{"key": "A", "text": "Case study"}, {"key": "B", "text": "Randomized controlled trial"}, {"key": "C", "text": "Experimental design"}, {"key": "D", "text": "Laboratory experiment"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('8ae84001-7a0f-4402-8c6e-7b6f7a11e64f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the main goal of ''Action Research''?', 'mcq', 1, 41, '{"options": [{"key": "A", "text": "To establish causal relationships"}, {"key": "B", "text": "To solve practical problems and improve practices"}, {"key": "C", "text": "To gather data from large samples"}, {"key": "D", "text": "To test theoretical models"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6f2bacb7-f71f-40d1-9751-435278b5301e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the context of research, ''Generalizability'' refers to:', 'mcq', 1, 42, '{"options": [{"key": "A", "text": "The ability to replicate the study"}, {"key": "B", "text": "The degree to which the findings can apply to other settings or populations"}, {"key": "C", "text": "The exactness of measurement tools used"}, {"key": "D", "text": "The ethics of the research study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d5f51aba-4233-4e83-b0c1-8bd85640fa1a', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a method of collecting qualitative data?', 'mcq', 1, 43, '{"options": [{"key": "A", "text": "Surveys with closed-ended questions"}, {"key": "B", "text": "Observation and interviews"}, {"key": "C", "text": "Statistical analysis"}, {"key": "D", "text": "Hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5f4955f9-1b9c-4dc3-af64-b2f671d72195', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is true about the ''Control variable''?', 'mcq', 1, 44, '{"options": [{"key": "A", "text": "It is the variable that is manipulated"}, {"key": "B", "text": "It is the variable that is measured"}, {"key": "C", "text": "It is held constant to prevent it from influencing the outcome"}, {"key": "D", "text": "It is the dependent variable"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('63c4cd32-95be-48be-86bb-9fdab3f835ae', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does a ''Descriptive statistic'' help researchers to do?', 'mcq', 1, 45, '{"options": [{"key": "A", "text": "Establish cause-and-effect relationships"}, {"key": "B", "text": "Summarize and describe the features of a dataset"}, {"key": "C", "text": "Make inferences about the population"}, {"key": "D", "text": "Conduct hypothesis testing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('54de6ea9-fcff-48bb-8b91-7d9d989a54cd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of a qualitative data collection method?', 'mcq', 1, 46, '{"options": [{"key": "A", "text": "Surveys with Likert scale"}, {"key": "B", "text": "Content analysis of documents"}, {"key": "C", "text": "Statistical regression"}, {"key": "D", "text": "Randomized controlled trials"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('02a81050-bcd3-4ddd-8c7f-ed0e515882dc', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the key feature of ''Grounded Theory''?', 'mcq', 1, 47, '{"options": [{"key": "A", "text": "Developing theory based on collected data"}, {"key": "B", "text": "Testing existing theories"}, {"key": "C", "text": "Collecting data through surveys"}, {"key": "D", "text": "Focusing on statistical analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6eab6196-d66c-402c-9edd-64c058611360', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the context of research, ''Operational Definition'' refers to:', 'mcq', 1, 48, '{"options": [{"key": "A", "text": "A variable that is difficult to measure"}, {"key": "B", "text": "A clear, precise description of how variables will be measured"}, {"key": "C", "text": "A theoretical explanation of a concept"}, {"key": "D", "text": "A summary of previous research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fef01d29-b141-4e78-becf-a98ebe28970e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a feature of a ''Quantitative'' research approach?', 'mcq', 1, 49, '{"options": [{"key": "A", "text": "Open-ended questions"}, {"key": "B", "text": "Numerical data analysis"}, {"key": "C", "text": "Small sample sizes"}, {"key": "D", "text": "Subjective interpretation of data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('52452012-8251-4189-be8f-4999fc67e77e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a common method for assessing reliability?', 'mcq', 1, 50, '{"options": [{"key": "A", "text": "Content analysis"}, {"key": "B", "text": "Cronbach\u2019s alpha"}, {"key": "C", "text": "Focus groups"}, {"key": "D", "text": "Thematic analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a13e01b4-68ea-4010-8d77-9e70e0f9dd55', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a ''Qualitative'' data analysis method?', 'mcq', 1, 51, '{"options": [{"key": "A", "text": "Linear regression"}, {"key": "B", "text": "Thematic analysis"}, {"key": "C", "text": "T-test"}, {"key": "D", "text": "Correlation analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('52d349ee-c458-4809-a22d-1c6cdbb21b0d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which type of data analysis is used to identify trends and make predictions?', 'mcq', 1, 52, '{"options": [{"key": "A", "text": "Descriptive statistics"}, {"key": "B", "text": "Predictive analysis"}, {"key": "C", "text": "Grounded theory analysis"}, {"key": "D", "text": "Discriminant analysis"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b9c30c47-bb3c-4121-8c2d-3d2731c71edf', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the primary goal of ''Hypothesis Testing''?', 'mcq', 1, 53, '{"options": [{"key": "A", "text": "To summarize the data"}, {"key": "B", "text": "To test the validity of a proposed relationship between variables"}, {"key": "C", "text": "To collect data"}, {"key": "D", "text": "To define variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('038259c7-cf7f-48dd-921f-415a2dcdc4a8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Secondary Data''?', 'mcq', 1, 54, '{"options": [{"key": "A", "text": "Interview responses from participants"}, {"key": "B", "text": "Focus group discussions"}, {"key": "C", "text": "Data collected from existing studies and reports"}, {"key": "D", "text": "Observational data collected during a study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('61532736-1aa5-4bc9-a553-98637c67b601', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which research method uses ''Random assignment'' to assign participants to different groups?', 'mcq', 1, 55, '{"options": [{"key": "A", "text": "Case study research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Observational research"}, {"key": "D", "text": "Qualitative research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('50a28b8f-fcef-4666-917d-5c0450afea10', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is a key feature of ''Mixed Methods Research''?', 'mcq', 1, 56, '{"options": [{"key": "A", "text": "Using only one type of data (quantitative or qualitative)"}, {"key": "B", "text": "Combining both quantitative and qualitative data collection and analysis"}, {"key": "C", "text": "Focusing solely on theory development"}, {"key": "D", "text": "Emphasizing statistical analysis exclusively"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('153226f4-f1a3-4703-9921-a3435373d55a', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Bias'' in research?', 'mcq', 1, 57, '{"options": [{"key": "A", "text": "The objective measurement of variables"}, {"key": "B", "text": "The unintended influence on study results"}, {"key": "C", "text": "A clear, reproducible result"}, {"key": "D", "text": "The random selection of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9424049c-c724-4361-acff-494b78ef5fef', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In a research study, the ''Dependent Variable'' is:', 'mcq', 1, 58, '{"options": [{"key": "A", "text": "The variable that is manipulated by the researcher"}, {"key": "B", "text": "The variable that changes in response to the independent variable"}, {"key": "C", "text": "The variable that remains constant throughout the study"}, {"key": "D", "text": "The outcome of the researcher''s actions"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e97ff83a-67af-435f-930a-cdc63a3554b4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a feature of ''Qualitative Research''?', 'mcq', 1, 59, '{"options": [{"key": "A", "text": "Large sample sizes"}, {"key": "B", "text": "Numerical analysis"}, {"key": "C", "text": "Focus on individual experiences and meanings"}, {"key": "D", "text": "Use of statistical techniques for hypothesis testing"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a772d13b-3ab2-45c1-a3d1-9fb6776b06fd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Systematic sampling''?', 'mcq', 1, 60, '{"options": [{"key": "A", "text": "Selecting every nth person from a list"}, {"key": "B", "text": "Selecting participants based on their availability"}, {"key": "C", "text": "Randomly selecting participants from a population"}, {"key": "D", "text": "Selecting participants from specific subgroups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7920035d-3328-406e-894e-cf1cdf7ba046', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is the primary disadvantage of using ''Self-reported data''?', 'mcq', 1, 61, '{"options": [{"key": "A", "text": "The data is difficult to interpret"}, {"key": "B", "text": "It is time-consuming to collect"}, {"key": "C", "text": "It may be subject to bias and inaccurate responses"}, {"key": "D", "text": "It provides too much detail"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('342100ff-f5d2-4971-b926-ac30e6e2f093', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is the purpose of ''Inferential statistics''?', 'mcq', 1, 62, '{"options": [{"key": "A", "text": "To summarize the characteristics of a dataset"}, {"key": "B", "text": "To make inferences or predictions about a population based on a sample"}, {"key": "C", "text": "To describe data visually"}, {"key": "D", "text": "To explore relationships between variables in detail"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('41ea2290-50a0-4c00-a11c-d53d0676c9fa', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an ethical requirement in human research studies?', 'mcq', 1, 63, '{"options": [{"key": "A", "text": "Offering participants financial incentives"}, {"key": "B", "text": "Informed consent from participants"}, {"key": "C", "text": "Using only quantitative methods"}, {"key": "D", "text": "Excluding vulnerable populations"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('53cd4796-c678-4154-a214-67e4c3952feb', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the purpose of ''Randomization'' in an experimental study?', 'mcq', 1, 64, '{"options": [{"key": "A", "text": "To reduce sample size"}, {"key": "B", "text": "To ensure that every participant has an equal chance of being assigned to any group"}, {"key": "C", "text": "To control for variables"}, {"key": "D", "text": "To increase participant participation"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2059313c-459b-432f-9945-b84af0576266', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which type of research focuses on understanding the lived experiences of individuals through detailed interviews and observations?', 'mcq', 1, 65, '{"options": [{"key": "A", "text": "Phenomenological research"}, {"key": "B", "text": "Experimental research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f060dde1-affe-4aee-bf29-77b991d40848', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of a ''Quantitative research instrument''?', 'mcq', 1, 66, '{"options": [{"key": "A", "text": "Interview guide"}, {"key": "B", "text": "Questionnaire with Likert scale"}, {"key": "C", "text": "Observation notes"}, {"key": "D", "text": "Case study protocol"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d310665e-85ba-4556-962f-0ebff2c8160a', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Participant observation'' involve in qualitative research?', 'mcq', 1, 67, '{"options": [{"key": "A", "text": "Collecting data without any interaction with the participants"}, {"key": "B", "text": "Observing participants from a distance with no involvement"}, {"key": "C", "text": "Actively engaging with participants while observing their behavior"}, {"key": "D", "text": "Collecting numerical data from the participants"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('17a5948d-ca90-4189-a589-c2870754c6c0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following best describes the ''Clarity'' of a research hypothesis?', 'mcq', 1, 68, '{"options": [{"key": "A", "text": "It is general and vague"}, {"key": "B", "text": "It should be stated in clear, testable terms"}, {"key": "C", "text": "It should be untestable"}, {"key": "D", "text": "It does not need to specify the relationship between variables"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('71b003ad-65c9-4fb8-8df4-bfd6e5913f92', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following methods is commonly used in ''Exploratory Research''?', 'mcq', 1, 69, '{"options": [{"key": "A", "text": "Surveys"}, {"key": "B", "text": "Case studies"}, {"key": "C", "text": "Controlled experiments"}, {"key": "D", "text": "Focus groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9caa2159-793e-4e65-bf1f-f9fd9c687555', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Purposive sampling''?', 'mcq', 1, 70, '{"options": [{"key": "A", "text": "A non-random method of selecting participants based on specific characteristics"}, {"key": "B", "text": "A random selection of participants from a population"}, {"key": "C", "text": "Selecting participants who are easy to access"}, {"key": "D", "text": "Selecting participants based on their willingness to participate"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a10b90ce-0150-434d-8ee3-0352fdb59f0e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the main advantage of ''Random Sampling''?', 'mcq', 1, 71, '{"options": [{"key": "A", "text": "It eliminates bias in the selection of participants"}, {"key": "B", "text": "It requires less time and effort"}, {"key": "C", "text": "It ensures all variables are controlled"}, {"key": "D", "text": "It guarantees accurate results for qualitative studies"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('87100a72-169f-4493-982e-b626001b5d31', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a type of research where the researcher manipulates the independent variable?', 'mcq', 1, 72, '{"options": [{"key": "A", "text": "Correlational research"}, {"key": "B", "text": "Descriptive research"}, {"key": "C", "text": "Experimental research"}, {"key": "D", "text": "Observational research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9affed99-6e6e-46de-a4f6-acf9d43a0c32', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Triangulation'' in research?', 'mcq', 1, 73, '{"options": [{"key": "A", "text": "Using multiple data sources, methods, or theories to increase the validity of research findings"}, {"key": "B", "text": "The process of analyzing data with one method only"}, {"key": "C", "text": "The testing of hypotheses with experimental methods only"}, {"key": "D", "text": "The selection of a single data source for analysis"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('80081deb-ec28-42e8-a1af-3be73dbabf44', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is true about a ''Longitudinal'' study?', 'mcq', 1, 74, '{"options": [{"key": "A", "text": "Data is collected at one point in time"}, {"key": "B", "text": "It is conducted over an extended period of time to track changes over time"}, {"key": "C", "text": "It manipulates variables to establish cause-effect relationships"}, {"key": "D", "text": "It focuses on a small group of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9c765b46-a4dc-4c0e-a74d-6856b548dd76', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following describes ''Reliability'' in research?', 'mcq', 1, 75, '{"options": [{"key": "A", "text": "The accuracy of measurement"}, {"key": "B", "text": "The consistency of measurement over time"}, {"key": "C", "text": "The significance of results"}, {"key": "D", "text": "The ability to generalize results"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('155a0f3c-cf1c-4e35-a759-efbb58ac57b9', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is NOT a feature of ''Descriptive Research''?', 'mcq', 1, 76, '{"options": [{"key": "A", "text": "It focuses on describing characteristics or phenomena"}, {"key": "B", "text": "It manipulates variables to test hypotheses"}, {"key": "C", "text": "It collects data to summarize the situation"}, {"key": "D", "text": "It is often used to create baseline data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f0ab85c0-0227-41aa-97c9-43af8ff4f7b0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which sampling method ensures that the population is evenly represented by dividing it into distinct subgroups?', 'mcq', 1, 77, '{"options": [{"key": "A", "text": "Simple random sampling"}, {"key": "B", "text": "Stratified sampling"}, {"key": "C", "text": "Snowball sampling"}, {"key": "D", "text": "Convenience sampling"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('36bc7bf8-fe47-4c69-ba6c-8b01b28d0e67', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In a research study, the ''Independent Variable'' is:', 'mcq', 1, 78, '{"options": [{"key": "A", "text": "The variable that is measured or observed"}, {"key": "B", "text": "The variable that remains constant"}, {"key": "C", "text": "The variable that is manipulated or changed by the researcher"}, {"key": "D", "text": "The variable that is not related to the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a4fdd1bb-712d-427b-b3ab-e92bc34900dd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Sampling Bias'' refer to?', 'mcq', 1, 79, '{"options": [{"key": "A", "text": "The random selection of participants"}, {"key": "B", "text": "The tendency to select participants who represent the population"}, {"key": "C", "text": "The error introduced due to non-random selection of participants"}, {"key": "D", "text": "The statistical analysis of the sample data"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('bd7b3b79-a193-4f17-aef6-9b86cf0cf29f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Nominal'' data?', 'mcq', 1, 80, '{"options": [{"key": "A", "text": "Height of individuals"}, {"key": "B", "text": "Types of fruits (apple, banana, orange)"}, {"key": "C", "text": "Temperatures in Celsius"}, {"key": "D", "text": "Weight of animals"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('20f4e152-d1f1-4509-9c86-223e6e125a1d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following best describes ''Secondary Research''?', 'mcq', 1, 81, '{"options": [{"key": "A", "text": "Collecting data directly from participants"}, {"key": "B", "text": "Analyzing existing data collected by other researchers"}, {"key": "C", "text": "Conducting surveys to gather original data"}, {"key": "D", "text": "Experimenting with new data collection methods"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0dddd500-bc85-4139-bae2-c3fcc5d63a56', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the purpose of ''Theoretical Framework'' in research?', 'mcq', 1, 82, '{"options": [{"key": "A", "text": "To define the scope of the study"}, {"key": "B", "text": "To guide data analysis and interpretation"}, {"key": "C", "text": "To test hypotheses"}, {"key": "D", "text": "To collect primary data"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('79bde823-da04-4bbf-9bf9-c4756a91c849', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Interval'' data?', 'mcq', 1, 83, '{"options": [{"key": "A", "text": "Number of students in a class"}, {"key": "B", "text": "Temperature in Celsius"}, {"key": "C", "text": "Eye color of individuals"}, {"key": "D", "text": "Gender of participants"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('dae960cd-03b2-4443-94c0-ae79afa055d2', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In a ''Causal-comparative research design'', researchers try to:', 'mcq', 1, 84, '{"options": [{"key": "A", "text": "Observe and describe behaviors"}, {"key": "B", "text": "Establish cause-and-effect relationships"}, {"key": "C", "text": "Focus on one individual case"}, {"key": "D", "text": "Compare differences in unrelated groups"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('85240131-092e-4b98-9392-52ce8eac50cf', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is the primary function of ''Pilot Testing'' in research?', 'mcq', 1, 85, '{"options": [{"key": "A", "text": "To test the final data analysis"}, {"key": "B", "text": "To gather primary data"}, {"key": "C", "text": "To test the research design and instruments before the main study"}, {"key": "D", "text": "To calculate the sample size"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b30c6e11-5900-4221-ba9d-fe4442ea3ecd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is a ''Double-blind'' experiment?', 'mcq', 1, 86, '{"options": [{"key": "A", "text": "An experiment where both participants and experimenters are unaware of the group assignments"}, {"key": "B", "text": "An experiment where only participants are unaware of the group assignments"}, {"key": "C", "text": "An experiment where only the researchers are unaware of the outcomes"}, {"key": "D", "text": "An experiment involving two different types of groups"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0215acee-530a-468b-a307-0b1e633d5856', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following describes ''Naturalistic Observation''?', 'mcq', 1, 87, '{"options": [{"key": "A", "text": "Observing participants in a controlled lab setting"}, {"key": "B", "text": "Observing participants without their knowledge"}, {"key": "C", "text": "Observing participants in their natural environment without interference"}, {"key": "D", "text": "Manipulating the environment to test hypotheses"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9263333b-ae77-4a3f-b8ee-f32888e2a209', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In research, ''Confounding Variables'' are:', 'mcq', 1, 88, '{"options": [{"key": "A", "text": "Variables that are irrelevant to the study"}, {"key": "B", "text": "Variables that are deliberately manipulated"}, {"key": "C", "text": "Variables that affect the dependent variable but are not part of the research design"}, {"key": "D", "text": "Variables that are measured during the study"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ae9be29f-9cf9-4cc9-955c-ba17e2fb44c9', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which type of research is used to investigate the relationships between variables without manipulating them?', 'mcq', 1, 89, '{"options": [{"key": "A", "text": "Experimental research"}, {"key": "B", "text": "Correlational research"}, {"key": "C", "text": "Longitudinal research"}, {"key": "D", "text": "Descriptive research"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('cdb1ba04-9877-43eb-acc7-792d1c43e3da', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is an example of ''Ethnographic Research''?', 'mcq', 1, 90, '{"options": [{"key": "A", "text": "Surveying a large population"}, {"key": "B", "text": "Conducting in-depth interviews with participants"}, {"key": "C", "text": "Studying cultural groups through immersion and observation"}, {"key": "D", "text": "Analyzing historical documents"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('88fe3b15-5708-40e0-8de8-2998dddba48d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Cluster Sampling'' involve?', 'mcq', 1, 91, '{"options": [{"key": "A", "text": "Dividing the population into groups and randomly selecting from those groups"}, {"key": "B", "text": "Randomly selecting individuals from the population"}, {"key": "C", "text": "Selecting every nth participant from a list"}, {"key": "D", "text": "Selecting participants based on their specific traits"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1c4512e7-17ea-4073-a11a-7e4390bad8d6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a disadvantage of using ''Convenience Sampling''?', 'mcq', 1, 92, '{"options": [{"key": "A", "text": "It is time-consuming and expensive"}, {"key": "B", "text": "It provides a high degree of randomness"}, {"key": "C", "text": "It may introduce sampling bias due to ease of selection"}, {"key": "D", "text": "It requires sophisticated data analysis"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('aff4f493-fdd5-4485-9498-04f820b66894', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Content Analysis'' typically involve in qualitative research?', 'mcq', 1, 93, '{"options": [{"key": "A", "text": "Analyzing statistical data from surveys"}, {"key": "B", "text": "Analyzing text, media, or documents to identify patterns or themes"}, {"key": "C", "text": "Conducting interviews and analyzing responses"}, {"key": "D", "text": "Conducting experiments to test hypotheses"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6dbd99f6-be22-4fd7-ad46-a0db425a28db', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a key advantage of ''Focus Groups'' in qualitative research?', 'mcq', 1, 94, '{"options": [{"key": "A", "text": "Provides large-scale data"}, {"key": "B", "text": "Allows in-depth exploration of participants'' experiences and opinions"}, {"key": "C", "text": "Involves only quantitative data collection"}, {"key": "D", "text": "Is highly objective and free from bias"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c5ebe767-1b9f-4a2b-89f0-fc38b92e2f6d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''Multivariate Analysis'' examine?', 'mcq', 1, 95, '{"options": [{"key": "A", "text": "The relationship between two variables"}, {"key": "B", "text": "The relationship between more than two variables simultaneously"}, {"key": "C", "text": "The cause-and-effect relationship between variables"}, {"key": "D", "text": "The frequency distribution of a single variable"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('78ebaa95-d5cf-4aa3-accc-567e1a836100', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'In the context of research, ''Transparency'' refers to:', 'mcq', 1, 96, '{"options": [{"key": "A", "text": "The clarity of the research hypothesis"}, {"key": "B", "text": "The openness and clarity in reporting the research process and findings"}, {"key": "C", "text": "The use of complex statistical methods"}, {"key": "D", "text": "The confidentiality of participant information"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2a84ee4d-7daf-498b-87f5-738e7f78b0b0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'Which of the following is a key element in a ''Research Proposal''?', 'mcq', 1, 97, '{"options": [{"key": "A", "text": "The collection of data"}, {"key": "B", "text": "The introduction and review of the literature"}, {"key": "C", "text": "The detailed results of the study"}, {"key": "D", "text": "The data analysis techniques used in the study"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b7a14c44-cc6b-451a-861b-b49413c7183f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What is ''Internal Validity'' in research?', 'mcq', 1, 98, '{"options": [{"key": "A", "text": "The degree to which the study results can be generalized to other settings"}, {"key": "B", "text": "The consistency of the research results over time"}, {"key": "C", "text": "The degree to which the study accurately measures the intended variables"}, {"key": "D", "text": "The ethical considerations of the research"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('551fd707-c18e-474d-ab69-aaa6b25b86e4', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '99b07f5e-e857-41b3-be9a-bc3c0711004b', 'What does ''External Validity'' refer to in research?', 'mcq', 1, 99, '{"options": [{"key": "A", "text": "The consistency of the research results"}, {"key": "B", "text": "The extent to which the results can be generalized to other populations or settings"}, {"key": "C", "text": "The ethical treatment of participants"}, {"key": "D", "text": "The precision of measurement tools used"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1eb5e5c7-3c8c-411a-8dd4-c742c79a84d3', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '2, 6, 12, 20, 30, ?', 'mcq', 1, 0, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4f3cb397-1600-4ae5-93f7-0b9494ad828e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '5, 10, 20, 40, ?', 'mcq', 1, 1, '{"options": [{"key": "A", "text": "60"}, {"key": "B", "text": "70"}, {"key": "C", "text": "80"}, {"key": "D", "text": "100"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b2533033-5ded-4f37-824c-9c4849bece1b', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '1, 4, 9, 16, 25, ?', 'mcq', 1, 2, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "36"}, {"key": "C", "text": "49"}, {"key": "D", "text": "64"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('be551a31-0428-4c4e-ad65-e36bb616e918', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '3, 8, 15, 24, 35, ?', 'mcq', 1, 3, '{"options": [{"key": "A", "text": "46"}, {"key": "B", "text": "48"}, {"key": "C", "text": "50"}, {"key": "D", "text": "52"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d97046e8-16f0-4b27-ba7d-13d378da2620', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '7, 14, 28, 56, ?', 'mcq', 1, 4, '{"options": [{"key": "A", "text": "98"}, {"key": "B", "text": "112"}, {"key": "C", "text": "120"}, {"key": "D", "text": "124"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6a69644d-178b-4369-af75-6c0736aea0bc', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '11, 13, 17, 19, 23, ?', 'mcq', 1, 5, '{"options": [{"key": "A", "text": "25"}, {"key": "B", "text": "27"}, {"key": "C", "text": "29"}, {"key": "D", "text": "31"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('443eb81a-97de-4007-a7b6-67896ebd5ffb', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '2, 5, 10, 17, 26, ?', 'mcq', 1, 6, '{"options": [{"key": "A", "text": "35"}, {"key": "B", "text": "37"}, {"key": "C", "text": "39"}, {"key": "D", "text": "41"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('99a1f19c-10fd-4c4c-b1a4-815cb35e50ed', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '81, 27, 9, 3, ?', 'mcq', 1, 7, '{"options": [{"key": "A", "text": "1"}, {"key": "B", "text": "2"}, {"key": "C", "text": "4"}, {"key": "D", "text": "6"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1e203054-77f3-42a5-b474-69b5afa83372', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '4, 9, 16, 25, 36, ?', 'mcq', 1, 8, '{"options": [{"key": "A", "text": "47"}, {"key": "B", "text": "48"}, {"key": "C", "text": "49"}, {"key": "D", "text": "50"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d323bb14-667b-4a07-b3bd-123a355177e8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', '1, 8, 27, 64, ?', 'mcq', 1, 9, '{"options": [{"key": "A", "text": "81"}, {"key": "B", "text": "100"}, {"key": "C", "text": "125"}, {"key": "D", "text": "216"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('365888fc-7c99-4dd6-ba73-3ca20124bc08', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Book : Reading :: Fork : ?', 'mcq', 1, 10, '{"options": [{"key": "A", "text": "Writing"}, {"key": "B", "text": "Eating"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Washing"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9076eda5-9345-4ec4-993b-7e9ef8e6e462', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Bird : Nest :: Bee : ?', 'mcq', 1, 11, '{"options": [{"key": "A", "text": "Hive"}, {"key": "B", "text": "Hole"}, {"key": "C", "text": "Tree"}, {"key": "D", "text": "Cave"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2d13540c-ec14-4634-ab0b-d53542a3dabd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Doctor : Hospital :: Teacher : ?', 'mcq', 1, 12, '{"options": [{"key": "A", "text": "School"}, {"key": "B", "text": "Library"}, {"key": "C", "text": "Office"}, {"key": "D", "text": "Home"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3d5e549d-af0b-40f8-a667-325a59fba0c1', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Puppy : Dog :: Kitten : ?', 'mcq', 1, 13, '{"options": [{"key": "A", "text": "Tiger"}, {"key": "B", "text": "Cat"}, {"key": "C", "text": "Lion"}, {"key": "D", "text": "Rabbit"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3081adad-ffae-40f7-89d8-5f9693bac698', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Foot : Shoe :: Hand : ?', 'mcq', 1, 14, '{"options": [{"key": "A", "text": "Ring"}, {"key": "B", "text": "Watch"}, {"key": "C", "text": "Glove"}, {"key": "D", "text": "Bracelet"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b4fc67a7-437e-4199-a658-dfbd05d1f3c8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Water : Thirst :: Food : ?', 'mcq', 1, 15, '{"options": [{"key": "A", "text": "Hunger"}, {"key": "B", "text": "Taste"}, {"key": "C", "text": "Cooking"}, {"key": "D", "text": "Energy"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('303ef8c3-b962-4e5a-be97-b6b18c5fb6c6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Pen : Ink :: Car : ?', 'mcq', 1, 16, '{"options": [{"key": "A", "text": "Petrol"}, {"key": "B", "text": "Wheel"}, {"key": "C", "text": "Driver"}, {"key": "D", "text": "Road"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('952b8876-1f2e-434f-b660-836be00466e6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Eye : See :: Ear : ?', 'mcq', 1, 17, '{"options": [{"key": "A", "text": "Touch"}, {"key": "B", "text": "Hear"}, {"key": "C", "text": "Taste"}, {"key": "D", "text": "Speak"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('958c0af6-b26e-4764-bc0b-6c914b95c490', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'King : Queen :: Man : ?', 'mcq', 1, 18, '{"options": [{"key": "A", "text": "Girl"}, {"key": "B", "text": "Woman"}, {"key": "C", "text": "Lady"}, {"key": "D", "text": "Wife"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('5ee6b0e0-c233-4754-bec3-52600c1ec8bd', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Fish : Water :: Bird : ?', 'mcq', 1, 19, '{"options": [{"key": "A", "text": "Forest"}, {"key": "B", "text": "Air"}, {"key": "C", "text": "Nest"}, {"key": "D", "text": "Tree"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('fa7276e2-e9d4-47c8-810f-815b68896ecb', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 20, '{"options": [{"key": "A", "text": "Apple"}, {"key": "B", "text": "Mango"}, {"key": "C", "text": "Banana"}, {"key": "D", "text": "Potato"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d38d21cd-757b-4d95-a5ef-75dd7d719855', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 21, '{"options": [{"key": "A", "text": "Triangle"}, {"key": "B", "text": "Square"}, {"key": "C", "text": "Circle"}, {"key": "D", "text": "Pencil"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('a724d542-daf7-4138-b956-794ed264929c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 22, '{"options": [{"key": "A", "text": "Cow"}, {"key": "B", "text": "Goat"}, {"key": "C", "text": "Sheep"}, {"key": "D", "text": "Eagle"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3a7c4634-2c1d-4001-a2c6-c2034bc44c9c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 23, '{"options": [{"key": "A", "text": "January"}, {"key": "B", "text": "February"}, {"key": "C", "text": "March"}, {"key": "D", "text": "Monday"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3661fc2f-aa15-4a87-a442-9f36952eb951', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 24, '{"options": [{"key": "A", "text": "Red"}, {"key": "B", "text": "Blue"}, {"key": "C", "text": "Green"}, {"key": "D", "text": "Chair"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f100ab16-71c8-4bb4-9631-088a3b0bad19', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 25, '{"options": [{"key": "A", "text": "Bus"}, {"key": "B", "text": "Train"}, {"key": "C", "text": "Bicycle"}, {"key": "D", "text": "Rose"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4c17e22b-4458-4fc4-87e3-79baca86da05', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 26, '{"options": [{"key": "A", "text": "Gold"}, {"key": "B", "text": "Silver"}, {"key": "C", "text": "Copper"}, {"key": "D", "text": "Plastic"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('859b145c-3bea-4585-93df-202d3f950f3e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 27, '{"options": [{"key": "A", "text": "Lion"}, {"key": "B", "text": "Tiger"}, {"key": "C", "text": "Leopard"}, {"key": "D", "text": "Sparrow"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('228a2746-6eda-49f9-8076-8b60c069974c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 28, '{"options": [{"key": "A", "text": "Cricket"}, {"key": "B", "text": "Football"}, {"key": "C", "text": "Hockey"}, {"key": "D", "text": "Doctor"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('df357070-03eb-4e3f-89bc-dfd644528f69', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find Odd One Out', 'mcq', 1, 29, '{"options": [{"key": "A", "text": "Table"}, {"key": "B", "text": "Chair"}, {"key": "C", "text": "Sofa"}, {"key": "D", "text": "Apple"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0af9786f-94c7-4863-b1ed-b94a18a7d385', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If CAT = DBU, then DOG = ?', 'mcq', 1, 30, '{"options": [{"key": "A", "text": "EPH"}, {"key": "B", "text": "EOH"}, {"key": "C", "text": "FPH"}, {"key": "D", "text": "EPG"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b7fcf475-1821-4408-8035-2be0b045acae', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If PEN = QFO, then BOOK = ?', 'mcq', 1, 31, '{"options": [{"key": "A", "text": "CPPL"}, {"key": "B", "text": "CQQM"}, {"key": "C", "text": "CPPL"}, {"key": "D", "text": "BPPL"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('8c233e49-13c6-4965-8296-2318dd9fa4e6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If ROAD = SPBE, then CAR = ?', 'mcq', 1, 32, '{"options": [{"key": "A", "text": "DBS"}, {"key": "B", "text": "DBS"}, {"key": "C", "text": "DBS"}, {"key": "D", "text": "DBS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d6ad37fb-a6d2-4a46-ad94-97455f039d71', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If BAT = 21320, then CAT = ?', 'mcq', 1, 33, '{"options": [{"key": "A", "text": "31320"}, {"key": "B", "text": "32320"}, {"key": "C", "text": "31310"}, {"key": "D", "text": "32310"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('b4e85d87-a6df-4f12-a393-98e83fc116ef', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If APPLE = BQQMF, then GRAPE = ?', 'mcq', 1, 34, '{"options": [{"key": "A", "text": "HSBQF"}, {"key": "B", "text": "HSBPF"}, {"key": "C", "text": "HSBQG"}, {"key": "D", "text": "HSBRF"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0b5ca6c4-f933-4f19-9448-1eda43e91036', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If SUN = TVO, then MOON = ?', 'mcq', 1, 35, '{"options": [{"key": "A", "text": "NPPO"}, {"key": "B", "text": "NPPQ"}, {"key": "C", "text": "NQPP"}, {"key": "D", "text": "OPPQ"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6f3a8384-b1dd-47e4-8ec5-e49cf351df89', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If CODE = DPEF, then DATA = ?', 'mcq', 1, 36, '{"options": [{"key": "A", "text": "EBUB"}, {"key": "B", "text": "EBVA"}, {"key": "C", "text": "ECVB"}, {"key": "D", "text": "FCVB"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0808c4d8-a2e7-4ac3-ab75-6eb87d4da825', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If KING = LJOH, then QUEEN = ?', 'mcq', 1, 37, '{"options": [{"key": "A", "text": "RVFFO"}, {"key": "B", "text": "RVGFO"}, {"key": "C", "text": "RVFFP"}, {"key": "D", "text": "SVFFO"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('45cf4f41-75aa-4eb1-a8de-ad264b597267', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If BALL = CBMM, then CALL = ?', 'mcq', 1, 38, '{"options": [{"key": "A", "text": "DBMM"}, {"key": "B", "text": "DBNN"}, {"key": "C", "text": "EBNN"}, {"key": "D", "text": "DBML"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ba422cee-d3e9-45bc-8985-d284b1af3279', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If MOUSE = NPVTF, then RAT = ?', 'mcq', 1, 39, '{"options": [{"key": "A", "text": "SBU"}, {"key": "B", "text": "SAT"}, {"key": "C", "text": "RBU"}, {"key": "D", "text": "TBU"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c9ea6a05-c368-4d04-b57b-cd2e8cd70a61', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All cats are animals. Tom is a cat.', 'mcq', 1, 40, '{"options": [{"key": "A", "text": "Tom is an animal"}, {"key": "B", "text": "Tom is a dog"}, {"key": "C", "text": "Tom is a bird"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('0a33aed5-fd88-436b-8642-ad2e727a36ac', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All roses are flowers. Some flowers are red.', 'mcq', 1, 41, '{"options": [{"key": "A", "text": "Some roses are red"}, {"key": "B", "text": "All roses are red"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No rose is red"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('395afde6-295d-48c1-860c-3f3cef3f4c04', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All apples are fruits. All fruits are healthy.', 'mcq', 1, 42, '{"options": [{"key": "A", "text": "All apples are healthy"}, {"key": "B", "text": "Some apples are healthy"}, {"key": "C", "text": "No apples are healthy"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('24578015-b772-41c8-9aae-b70745571d80', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Some boys are players.', 'mcq', 1, 43, '{"options": [{"key": "A", "text": "All boys are players"}, {"key": "B", "text": "Some players are boys"}, {"key": "C", "text": "No players are boys"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('f924f925-496a-4294-96b4-de12e09c435f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All teachers are educated. Some educated people are writers.', 'mcq', 1, 44, '{"options": [{"key": "A", "text": "All teachers are writers"}, {"key": "B", "text": "Some writers are teachers"}, {"key": "C", "text": "Cannot say"}, {"key": "D", "text": "No teachers are writers"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('89018b61-44e7-471f-9a68-0194fb600ec6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All dogs are animals. No animal is a plant. Conclusion?', 'mcq', 1, 45, '{"options": [{"key": "A", "text": "No dog is a plant"}, {"key": "B", "text": "All plants are dogs"}, {"key": "C", "text": "Some dogs are plants"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('4e2befdc-ba07-4ddd-b160-a750e8204f84', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All cars have wheels. A car is a vehicle. Conclusion?', 'mcq', 1, 46, '{"options": [{"key": "A", "text": "All vehicles have wheels"}, {"key": "B", "text": "Some vehicles have wheels"}, {"key": "C", "text": "No vehicles have wheels"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('29bf9ea4-312d-4396-979c-ba3f80a32f9c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All pencils are stationery. All stationery are useful.', 'mcq', 1, 47, '{"options": [{"key": "A", "text": "All pencils are useful"}, {"key": "B", "text": "Some pencils are useful"}, {"key": "C", "text": "No pencils are useful"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('91db294c-ee8d-4ca1-8fb2-971130ee20b8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Some students are athletes.', 'mcq', 1, 48, '{"options": [{"key": "A", "text": "All athletes are students"}, {"key": "B", "text": "Some athletes are students"}, {"key": "C", "text": "No athletes are students"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('27c99d8d-6b2c-459f-b973-71b8e96bc181', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All books are papers. All papers are recyclable.', 'mcq', 1, 49, '{"options": [{"key": "A", "text": "All books are recyclable"}, {"key": "B", "text": "Some books are recyclable"}, {"key": "C", "text": "No books are recyclable"}, {"key": "D", "text": "Cannot say"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('74150c47-a5a6-46b3-901f-77234084bd89', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find the next number: 3, 7, 15, 31, 63, ?', 'mcq', 1, 50, '{"options": [{"key": "A", "text": "95"}, {"key": "B", "text": "127"}, {"key": "C", "text": "128"}, {"key": "D", "text": "131"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('11085b84-8968-4e52-8eb4-e8a8633cc9aa', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If TABLE is coded as UBCMF, then CHAIR is coded as:', 'mcq', 1, 51, '{"options": [{"key": "A", "text": "DIBJS"}, {"key": "B", "text": "DIBJR"}, {"key": "C", "text": "EJCJS"}, {"key": "D", "text": "DHCJR"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d6f34626-c0c5-4847-ab58-576ac1258231', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Which word does not belong to the group?', 'mcq', 1, 52, '{"options": [{"key": "A", "text": "Doctor"}, {"key": "B", "text": "Nurse"}, {"key": "C", "text": "Teacher"}, {"key": "D", "text": "Hospital"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('cd7b56cb-5420-42a9-b017-c3118aa71d9c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'A is taller than B. B is taller than C. Who is the shortest?', 'mcq', 1, 53, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('96435f47-4f6f-4946-8195-b37dc5b58e5c', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find the next letter: A, C, E, G, ?', 'mcq', 1, 54, '{"options": [{"key": "A", "text": "H"}, {"key": "B", "text": "I"}, {"key": "C", "text": "J"}, {"key": "D", "text": "K"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('3bfc29d2-5858-47e9-b6cb-72d2613f15e8', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If SOUTH is written as HTUOS, then NORTH is written as:', 'mcq', 1, 55, '{"options": [{"key": "A", "text": "HTRON"}, {"key": "B", "text": "NROTH"}, {"key": "C", "text": "HTRNO"}, {"key": "D", "text": "OTRHN"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('d730889b-a933-4fd8-845a-405a8c0789a0', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Which number is missing? 4, 9, 16, 25, ?, 49', 'mcq', 1, 56, '{"options": [{"key": "A", "text": "30"}, {"key": "B", "text": "35"}, {"key": "C", "text": "36"}, {"key": "D", "text": "40"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('9210b163-12ce-428d-a227-25c3ac69744e', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If all pens are books and all books are bags, then all pens are:', 'mcq', 1, 57, '{"options": [{"key": "A", "text": "Bags"}, {"key": "B", "text": "Books only"}, {"key": "C", "text": "Bags and books"}, {"key": "D", "text": "None"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('933c56f6-0701-4098-ab81-002be41fc75d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find the odd one out:', 'mcq', 1, 58, '{"options": [{"key": "A", "text": "8"}, {"key": "B", "text": "27"}, {"key": "C", "text": "64"}, {"key": "D", "text": "81"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('dc262f39-de9b-4161-babc-f7998ef343a9', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'A clock shows 3:00. What is the angle between the hands?', 'mcq', 1, 59, '{"options": [{"key": "A", "text": "60\u00b0"}, {"key": "B", "text": "75\u00b0"}, {"key": "C", "text": "90\u00b0"}, {"key": "D", "text": "120\u00b0"}], "correct_answer": "C"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('e5df70bd-4b82-47c7-8c5a-c26b62507482', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If CAT = 24 and DOG = 26, then BAT = ?', 'mcq', 1, 60, '{"options": [{"key": "A", "text": "22"}, {"key": "B", "text": "23"}, {"key": "C", "text": "24"}, {"key": "D", "text": "25"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('687cb576-4598-47a6-88ee-2fdd84efa6ac', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Pointing to a woman, Raj says, "She is the daughter of my mother''s only daughter." How is the woman related to Raj?', 'mcq', 1, 61, '{"options": [{"key": "A", "text": "Sister"}, {"key": "B", "text": "Daughter"}, {"key": "C", "text": "Niece"}, {"key": "D", "text": "Cousin"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1314cf33-fbb2-4418-8067-df854cc0f083', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find the next number: 2, 6, 12, 20, 30, ?', 'mcq', 1, 62, '{"options": [{"key": "A", "text": "40"}, {"key": "B", "text": "42"}, {"key": "C", "text": "44"}, {"key": "D", "text": "46"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('ff7eb25d-102d-4829-8cf0-35639808e995', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Which pair has the same relationship? Bird : Fly', 'mcq', 1, 63, '{"options": [{"key": "A", "text": "Fish : Swim"}, {"key": "B", "text": "Dog : Bark"}, {"key": "C", "text": "Cow : Milk"}, {"key": "D", "text": "Cat : Pet"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('59ac214b-8a36-48b3-92fe-a3dcb4c18ca6', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'A man walks 5 km East, then 5 km North. In which direction is he from the starting point?', 'mcq', 1, 64, '{"options": [{"key": "A", "text": "North-East"}, {"key": "B", "text": "South-East"}, {"key": "C", "text": "North-West"}, {"key": "D", "text": "West"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('2990d48f-b7c1-4ad3-80e9-9241d115b18d', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Find the odd one:', 'mcq', 1, 65, '{"options": [{"key": "A", "text": "Monday"}, {"key": "B", "text": "Wednesday"}, {"key": "C", "text": "Friday"}, {"key": "D", "text": "January"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('6c5e0e51-0144-4763-9020-757c860d43c5', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'If PENCIL is coded as QFODJM, then ERASER is coded as:', 'mcq', 1, 66, '{"options": [{"key": "A", "text": "FSBTFS"}, {"key": "B", "text": "GSBTFS"}, {"key": "C", "text": "FSCTFS"}, {"key": "D", "text": "GSBUFS"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('c4e32312-5cf5-4e10-942a-4dd2e690d0bf', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'All roses are flowers. Some flowers are yellow. Which conclusion follows?', 'mcq', 1, 67, '{"options": [{"key": "A", "text": "All roses are yellow"}, {"key": "B", "text": "Some roses are yellow"}, {"key": "C", "text": "No rose is yellow"}, {"key": "D", "text": "Cannot be determined"}], "correct_answer": "D"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('1f76ceea-3fd5-4afb-8fd5-527dfa9549cf', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Complete the series: Z, X, V, T, ?', 'mcq', 1, 68, '{"options": [{"key": "A", "text": "R"}, {"key": "B", "text": "Q"}, {"key": "C", "text": "P"}, {"key": "D", "text": "S"}], "correct_answer": "A"}', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO test_questions (id, test_id, section_id, question_text, question_type, marks, order_index, config, created_at)
VALUES ('7297f84c-c975-4756-87d7-c756bd9e8e1f', '0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7', '0e82764e-9c72-4587-beb1-0d8bd9cf5204', 'Five friends A, B, C, D, and E are sitting in a row. A is to the left of B, and C is to the right of B. Who is in the middle among A, B, and C?', 'mcq', 1, 69, '{"options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}, {"key": "C", "text": "C"}, {"key": "D", "text": "Cannot determine"}], "correct_answer": "B"}', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Test ID: 0eb0bfdc-7a8f-46b8-8e7d-bd6b821016d7
-- Section A ID: fd3c3a01-b745-4b7f-891a-577f7b84ae95
-- Section B ID: 99b07f5e-e857-41b3-be9a-bc3c0711004b
-- Section C ID: 0e82764e-9c72-4587-beb1-0d8bd9cf5204
