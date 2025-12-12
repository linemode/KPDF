KBSPDF E-learning Platform Development Plan (Node.js)

1. Project Overview
Develop an e-learning platform named K-PDF using Node.js. The platform will function as a repository for Korean educational materials,
allowing users to easily browse, search, and access PDF links organized by a deep, multi-level categorization system.

2. Content Structure and Categorization System
The core of the platform is its detailed, hierarchical categorization to ensure easy content discoverability.

Level	Name	Description	Mandatory Options
Level 1 (L1)	Educational Tier	Broad division of curriculum.	1. Secondary Education (중등 교육과정), 2. High School Education (고등 교육과정), 3. Other Resources (기타)
Level 2 (L2)	Subject	Core subjects within the selected tier.	1. Korean Language (국어), 2. Mathematics (수학), 3. English (영어), 4. Science (과학), 5. Social Studies (사회), 6. Electives/Other (기타)
Level 3 (L3)	Grade/Year	Specific grade or academic year.	
Secondary: Grade 7 (중1), Grade 8 (중2), Grade 9 (중3)


High School: Grade 10 (고1), Grade 11 (고2), Grade 12 (고3)

Level 4 (L4)	Content Type	Defines the nature of the material.	1. Textbook (교과서), 2. Workbook/Problem Set (문제집), 3. Answer Key/Solution (해답지), 4. Exam/Test Papers (시험지)
Level 5 (L5)	Publisher/Source	(Optional but recommended) For filtering by specific publishers (e.g., Mirae-N, Kyohaksa, etc.).	User-defined/Admin-Input

3. Admin Panel Functionality (CMS)

The Admin Panel must provide a simple interface for content management:

PDF Link Upload: The administrator must be able to input a direct, publicly accessible URL link to a PDF file. The system must validate that the link ends with the .pdf extension.

Category Assignment: For each upload, the administrator must select a specific category path using the L1 through L4 hierarchy (e.g., High School > Mathematics > Grade 12 > Workbook).

Metadata Entry: The admin must input two distinct titles for each PDF:

Main Title: The primary, descriptive title (e.g., "High School Math I Workbook").

Subtitle/Short Title: A brief, optional title for secondary display (e.g., "Chapter 3 Review").

Database Storage: All data (Category Path, PDF Link, Main Title, Subtitle, and a unique identifier) must be stored in a JSON structure within the database

4. Database Structure Example (JSON)
The stored data should follow a simple structure for easy retrieval:

{
  "id": "unique_id_001",
  "category_l1": "High School Education",
  "category_l2": "Mathematics",
  "category_l3": "Grade 11",
  "category_l4": "Workbook/Problem Set",
  "main_title": "Concept Power Math B - Advanced Calculus",
  "subtitle": "Chapter 5: Sequences and Series",
  "pdf_url": "https://example.com/pdfs/hsmb_calc_ch5.pdf",
  "upload_date": "2025-12-09T18:00:00Z"
}

5. Customer Support & Request Feature
A basic Customer Service (CS) / Support Page must be included.

Material Request Form: This feature should allow users to submit requests for specific materials that are not yet available on the platform. The form should capture:

User Contact (Email/Name)

Requested Material Title

Specific Categories (L1-L4) (e.g., Middle School / Science / Grade 8 / Textbook)

Additional Comments