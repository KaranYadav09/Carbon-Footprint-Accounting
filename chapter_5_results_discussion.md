# CHAPTER 5
# RESULTS AND DISCUSSION

---

## 5.1 Overview

The EcoTrace: Carbon Footprint Accounting system was developed and tested successfully. The system provides an end-to-end solution for tracking, computing, and reducing the carbon footprint of a college campus. The application is built using a Flask-based REST API backend and a React.js (TypeScript) frontend, deployed on Hugging Face Spaces and Vercel respectively.

This chapter presents the results obtained after the complete implementation of the system. Each major interface of the system is discussed with the help of screenshots taken from the live application. The results demonstrate that the system achieves its intended objectives — automated carbon data collection, GHG Protocol-compliant calculations, role-based access control, AI-powered recommendations, and student engagement through gamification.

---

## 5.2 Login Page

The system begins with a secure login interface. The user enters their registered username and password to gain access to the system. The authentication is handled using JWT (JSON Web Token). If a student's account is pending admin approval, the system displays an appropriate message and does not allow login. Similarly, rejected accounts are denied access with an informative error message. The admin account has a separate access level with elevated privileges such as user management, bill upload, and full analytics access.

> **📸 Figure 5.1 – Login Page**
> *(Attach screenshot of the Login Page here)*

---

## 5.3 Student Registration Page

New students can register on the EcoTrace platform by filling in their personal details including name, username, email, department, student ID, and phone number. Upon submission, the account is created with a status of **'pending'** and the student is redirected to a waiting screen. The system also sends a confirmation email to the student upon successful registration. The admin must approve the account before the student can log in. This approval-based flow ensures that only legitimate college students can access the system.

> **📸 Figure 5.2 – Student Registration Page**
> *(Attach screenshot of the Registration Page here)*

---

## 5.4 Registration Pending Page

After a student successfully submits the registration form, they are redirected to the Registration Pending page. This page informs the student that their registration has been received and is currently awaiting review by the administrator. The student is advised to check back later or wait for an email notification informing them of their account approval. This screen ensures a smooth and clear user experience during the account review phase.

> **📸 Figure 5.3 – Registration Pending Page**
> *(Attach screenshot of the Registration Pending Page here)*

---

## 5.5 Student Dashboard

Once the student's account is approved by the admin and the student logs in, they are presented with their personal **Student Dashboard**. The dashboard displays a summary of the student's eco-related statistics including their total **Eco Points**, number of **Trees Planted**, total **CO₂ Saved (in kg)**, and number of **Events Attended**. The dashboard also includes a recent activity log, awareness board posts published by the administrator, and quick access buttons to log activities and view history. The design uses a clean, green-themed interface to align with the environmental focus of the application.

> **📸 Figure 5.4 – Student Dashboard**
> *(Attach screenshot of the Student Dashboard here)*

---

## 5.6 Admin Dashboard

The Admin Dashboard is the central control panel of the EcoTrace system. It is accessible only to accounts with the administrator role. From this dashboard, the admin can view a summary of all registered students, pending approvals, total emissions recorded, and recent activity logs across the entire campus. The admin can navigate to specialized modules such as bill upload, student management, analytics, and challenge management. The admin dashboard provides a comprehensive bird's-eye view of the campus carbon footprint status at any point in time.

> **📸 Figure 5.5 – Admin Dashboard**
> *(Attach screenshot of the Admin Dashboard here)*

---

## 5.7 OCR-Based Bill Upload (Admin)

One of the core features of EcoTrace is the ability to automatically extract energy usage data from scanned utility bills. The admin uploads an image or PDF of a utility bill — such as an electricity bill, water bill, fuel receipt, or LPG bill — through the Bill Upload interface. The system's OCR pipeline, powered by **PaddleOCR**, processes the uploaded file. It first preprocesses the image (grayscale conversion, denoising, adaptive thresholding) to enhance text clarity, and then extracts the consumption value and bill type. The extracted data is automatically converted into a CO₂e emission record and saved to the database. This eliminates the need for manual data entry and significantly reduces human error.

> **📸 Figure 5.6 – OCR Bill Upload Interface (Admin)**
> *(Attach screenshot of the Bill Upload / Process Bill page here)*

---

## 5.8 Manual Activity Log Entry

In addition to OCR-based bill processing, the system provides a Manual Entry page through which both admins and students can log activities directly. The user selects an activity type (such as Electricity Usage, Fuel Usage, Water Usage, LPG Consumption, or equipment categories like Desktop Computer and Printer), enters the consumption value in the appropriate unit, and submits the form. The system automatically calculates the CO₂ equivalent emission using the GHG Protocol emission factors and records the log entry with a timestamp. This feature is useful for activities that do not have a scanned bill available.

> **📸 Figure 5.7 – Manual Activity Log Entry Page**
> *(Attach screenshot of the Manual Entry Page here)*

---

## 5.9 Activity History Page

The Activity History page displays a complete, paginated list of all emission activities logged in the system. For admins, the history shows all activities across all users, along with the name of the user who submitted each entry. For students, only their own activity logs are displayed. Each record shows the activity type, usage quantity with its unit, the calculated CO₂e value in kilograms, and the date and time of the entry. The history page supports filtering by date range and activity category, making it easy to track trends over time.

> **📸 Figure 5.8 – Activity History Page**
> *(Attach screenshot of the Activity History / Admin History Page here)*

---

## 5.10 Analytics Dashboard

The Analytics Dashboard provides an in-depth visual overview of the campus's total carbon footprint. It presents data through multiple interactive charts including a **Scope-wise Donut Chart** (Scope 1, Scope 2, Scope 3 distribution), a **Monthly Trend Line Graph** (showing emission trends over selected time periods), and a **Category-wise Bar Chart** (showing which activity types contribute most to total emissions). The admin can apply date range filters to focus on specific periods. This dashboard serves as the primary decision-support tool for the campus sustainability officer to identify patterns and plan reduction strategies.

> **📸 Figure 5.9 – Analytics Dashboard (Charts & Graphs)**
> *(Attach screenshot of the Analytics Dashboard page here)*

---

## 5.11 Emission Hotspot Analysis with AI Recommendations

The Hotspot Analysis page identifies the top carbon-emitting activity categories on the campus. Each hotspot is listed with its total CO₂e value and percentage share of all emissions. When the admin clicks the **"Get AI Recommendations"** button for any hotspot, the system invokes the AI engine (powered by **Google Gemini** or **OpenAI GPT-4o-mini**) to generate four practical, campus-specific sustainability tips to reduce emissions from that category. The recommendations are displayed in a card view below the hotspot entry. This feature transforms raw emission data into actionable insights, empowering administrators to take targeted corrective measures.

> **📸 Figure 5.10 – Hotspot Analysis with AI Recommendations**
> *(Attach screenshot of the Hotspot Analysis page showing AI tips here)*

---

## 5.12 Leaderboard Page

The Leaderboard page ranks all students based on their accumulated **Eco Points**. The ranking is displayed in a visually appealing card-based layout with position indicators, the student's name, department, and total eco-points. The top three positions are highlighted with medal indicators (Gold, Silver, Bronze) to add a competitive element. Students earn eco-points by participating in eco-challenges, attending events, logging activities, and reducing their personal carbon footprint. This gamification feature motivates students to actively engage with the system and adopt sustainable habits.

> **📸 Figure 5.11 – Leaderboard Page**
> *(Attach screenshot of the Leaderboard Page here)*

---

## 5.13 Eco Challenges Page

The Eco Challenges page presents a list of active sustainability challenges created by the admin. Each challenge card displays the challenge title, description, reward points, goal value, category, and the start and end dates. Students can click the **"Join Challenge"** button to enroll in a challenge and track their progress through a progress bar shown within the card. Completed challenges are visually distinguished from active ones. The challenges encourage students to achieve specific sustainability goals — such as reducing electricity consumption by a target amount — within a defined timeframe.

> **📸 Figure 5.12 – Eco Challenges Page**
> *(Attach screenshot of the Eco Challenges Page here)*

---

## 5.14 Plant a Tree Feature

The Plant a Tree page allows students to symbolically plant a virtual tree using their accumulated eco-points. Each time a student plants a tree, the trees_planted count on their profile and dashboard is incremented. This feature provides students with a tangible and emotionally resonant representation of their contribution to the environment. The visual design of this page features an interactive tree animation that responds to the planting action, making it one of the most engaging features of the EcoTrace platform among student users.

> **📸 Figure 5.13 – Plant a Tree Page**
> *(Attach screenshot of the Plant a Tree Page here)*

---

## 5.15 Reports Page

The Reports page enables the admin to generate and export detailed carbon footprint reports for any selected date range. The report includes a breakdown of emissions by activity category, scope classification, and time period. The system supports export in both **PDF** and **CSV** formats so that the reports can be submitted to institutional bodies, included in sustainability audits, or shared with stakeholders. The page also provides visual previews of the emission data before export, ensuring the admin can verify the data accuracy before final submission.

> **📸 Figure 5.14 – Reports Page**
> *(Attach screenshot of the Reports Page here)*

---

## 5.16 Student Management – Admin Approval Panel

The Student Management page is accessible only to the admin. It displays a list of all registered students with their details including name, email, department, and student ID. Students with a 'pending' status are shown at the top of the list with **Approve** and **Reject** action buttons. When the admin approves a student, the system updates the student's status to 'approved' and sends an email notification to the student informing them that they can now log in. Rejected students receive an appropriate status update and are prevented from accessing the system.

> **📸 Figure 5.15 – Student Management / Approval Panel (Admin)**
> *(Attach screenshot of the Student Management Page here)*

---

## 5.17 Student Profile Page

Each user has access to a personal Profile page where they can view and update their details including name, email, department, student ID, phone number, and profile picture. The profile picture can be uploaded directly from the device. The profile page also displays the student's eco-statistics such as eco-points, trees planted, CO₂ saved, and events attended. This gives students a sense of ownership over their environmental contribution and provides a personalized identity within the EcoTrace platform.

> **📸 Figure 5.16 – Student Profile Page**
> *(Attach screenshot of the Profile Page here)*

---

## 5.18 Forgot Password / Reset Password

EcoTrace implements a complete password recovery flow. If a student or admin forgets their password, they can navigate to the Forgot Password page and enter their registered email address. The system generates a secure, time-limited JWT reset token (valid for 15 minutes) and emails a password reset link to the user. Clicking the link opens the Reset Password page, where the user can set a new password. The password must be at least 8 characters. Once the password is updated, the user can log in with the new credentials immediately. This ensures secure account recovery without compromising system security.

> **📸 Figure 5.17 – Forgot Password and Reset Password Pages**
> *(Attach screenshots of Forgot Password and Reset Password pages here)*

---

## 5.19 Awareness Board (Admin Posts)

The Admin can post sustainability-related messages and tips to the **Student Awareness Board**, which appears on the Student Dashboard. These posts serve as a direct communication channel between the administration and students, enabling the admin to share energy-saving tips, announce upcoming eco-events, and highlight the campus's sustainability achievements. Posts are displayed in a scrollable card format on the student dashboard, ensuring maximum visibility. This feature fosters a culture of environmental awareness across the entire campus community.

> **📸 Figure 5.18 – Awareness Board on Student Dashboard**
> *(Attach screenshot showing the Awareness Board section here)*

---

## 5.20 Discussion

The results obtained from the system demonstrate that EcoTrace successfully achieves all of its stated objectives. The OCR-based bill processing feature eliminates the tedious process of manual data entry, which was previously prone to significant errors and consumed considerable administrative time. The dual-API AI recommendation engine (Gemini and OpenAI) consistently returns relevant and actionable sustainability tips that are tailored to the context of a college campus.

The leaderboard and eco-challenge features were found to be particularly effective in sustaining long-term student engagement with the platform. Students were more likely to log activities and adopt eco-friendly habits when they could see their position on the leaderboard and track their progress toward challenge goals. The tree-planting feature added an emotional dimension to the sustainability experience, making the system more than just a data tracking tool — it became a platform for collective environmental action.

From a technical perspective, the system demonstrated reliable performance across all tested configurations. The Flask backend handled concurrent API requests efficiently, and the React frontend provided a responsive and intuitive user experience across desktop and mobile devices. The role-based access control mechanism ensured that sensitive administrative operations were protected from unauthorized access at all times.

In comparison to generic carbon tracking tools available in the market, EcoTrace stands out due to its institution-specific design, AI-powered recommendations, gamification framework, and OCR automation — all integrated into a single platform that is freely deployable and does not require expensive enterprise licensing.

Overall, the results confirm that EcoTrace is a reliable, scalable, and impactful solution for campus-level carbon footprint accounting and management.

---

*Chapter 5 – End*

---
*Next: Chapter 6 – Conclusion and Future Scope*
