# 🔎 Lost Item Recovery System

> A centralized digital platform for reporting, tracking, and recovering lost and found items at **Dhanekula Institute of Engineering & Technology (DIET)**.

🌐 **Live Application:** https://lost-item-recovery.onrender.com/

---

## 📌 Overview

The **Lost Item Recovery System** is a web-based platform designed to simplify the process of reporting, searching, communicating, and recovering lost belongings within the campus.

Instead of relying on physical announcements, informal communication, or manual records, the system provides a centralized platform where students and administrators can manage lost and found items efficiently.

The platform supports:

* Reporting lost items
* Reporting found items
* Tracking reported items
* Searching item records
* Managing student profiles
* Communicating through secure messages
* Handling urgent ID-card recovery
* Administrative monitoring and analytics
* Generating official resolution receipts

The deployed application provides separate workflows for regular users and administrators.

---

## 🎯 Problem Statement

Lost belongings are common in educational institutions, but recovering them can be difficult because information is often scattered across:

* Student groups
* Classrooms
* Security desks
* Notice boards
* Informal messages
* Manual registers

This creates delays in identifying owners and increases the possibility of items remaining unclaimed.

### 💡 Proposed Solution

The Lost Item Recovery System centralizes the entire recovery workflow into one digital platform.

A student can report an item as **lost** or **found**, provide relevant information such as location, date, category, description, and images, and allow administrators to manage the recovery process.

---

## ✨ Key Features

### 👤 User Features

#### 🔐 User Profile

Users can maintain their personal campus information, including:

* Full name
* Mobile number
* Roll number / ID
* Branch
* Section
* Academic year
* Gender
* Email ID
* Password

The deployed application includes profile editing and password-update functionality.

---

### 🔴 Report Lost Item

Users can submit a lost-item report containing:

* Item name
* Category
* Date lost
* Last-seen location
* Description
* Unique identifying marks
* Current status
* Optional image

This allows administrators and other users to identify and process the lost property.

---

### 🟢 Report Found Item

Users who find an item can submit:

* Item name
* Category
* Date found
* Found location
* Person/location where the item was handed over
* Current status

This creates a corresponding record that can be used during the recovery process.

---

### 🪪 Urgent ID Card Recovery

A dedicated workflow is provided for found student ID cards.

Users can enter the:

* Printed Roll Number / ID
* Current location of the ID card

The system can then search the student directory and initiate the campus notification workflow.

---

### 💬 Secure Messaging

The platform includes an internal communication system that allows users to send messages related to item recovery.

Features include:

* Message inbox
* Sending messages
* Viewing conversations
* Secure communication logs

The administrator interface also exposes communication logs for monitoring.

---

### 🛠️ Admin Portal

Administrators can monitor the recovery system through a centralized dashboard.

The admin functionality includes:

* Live lost-item statistics
* Found-item statistics
* Recovered-item statistics
* Average recovery time
* Registered-user directory
* Complete item database
* Item search
* Item filtering
* Status tracking
* Secure communication logs
* Receipt lookup

The live dashboard exposes these administrative views directly in the deployed application.

---

### 📊 Admin Analytics

The system provides operational metrics such as:

| Metric                | Purpose                                 |
| --------------------- | --------------------------------------- |
| Lost Reports          | Number of reported lost items           |
| Items Found           | Number of found-item reports            |
| Happily Recovered     | Number of successfully recovered items  |
| Average Recovery Time | Time taken from reporting to resolution |

These metrics help administrators understand the effectiveness of the campus recovery process.

---

### 🧾 Official Resolution Receipt

The system includes an **Official Resolution Log** and provides an option to generate/download a PDF receipt for completed recovery operations.

Administrators can also query records using an official receipt identifier such as:

```text
REC-20260321-14
```

The deployed interface exposes both receipt lookup and PDF receipt functionality.

---

## 🔄 System Workflow

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
          ┌──────────────┐           ┌──────────────┐
          │ Report Lost │           │ Report Found │
          └──────┬───────┘           └──────┬───────┘
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  Central Database   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Admin Verification  │
                    │ & Monitoring        │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
          ┌──────────────┐           ┌──────────────┐
          │   Messaging  │           │  Resolution  │
          └──────────────┘           └──────┬───────┘
                                            │
                                            ▼
                                  ┌──────────────────┐
                                  │ Official Receipt │
                                  └──────────────────┘
```

---

## 🧩 Main Modules

### 1. Authentication & User Management

Handles user access and personal profile information.

### 2. Lost Item Management

Allows users to register and track lost belongings.

### 3. Found Item Management

Allows users to report items they have discovered.

### 4. ID Card Recovery

Provides a dedicated mechanism for recovering student identification cards.

### 5. Messaging System

Enables communication between users regarding recovery operations.

### 6. Administration

Provides administrators with centralized control and monitoring.

### 7. Analytics

Provides recovery statistics and operational metrics.

### 8. Resolution Management

Maintains official records and generates resolution receipts.

---

## 🖥️ Application Interface

### Dashboard

The dashboard provides an overview of the recovery system with:

* Lost reports
* Found items
* Recovered items
* Recently reported items
* Item filters
* Administrative analytics

---

## 🗂️ Data Managed by the System

The application manages information associated with:

### Users

```text
Name
Email
Mobile
Roll Number
Branch
Section
Year
Gender
```

### Lost Items

```text
Item Name
Category
Date Lost
Last Seen Location
Description
Unique Marks
Image
Status
Reporter
```

### Found Items

```text
Item Name
Category
Date Found
Found Location
Handed Over To
Status
Reporter
```

### Communication

```text
Sender
Recipient
Message
Conversation
Communication Logs
```

### Resolution

```text
Resolution Status
Recovery Time
Official Receipt ID
Resolution Record
PDF Receipt
```

---

## 🚀 Live Demo

The project is deployed and accessible online:

### 🌐 https://lost-item-recovery.onrender.com/

---

## 🛠️ Technology Stack

> Update this section with the exact technologies used in your source repository if you want the README to document the implementation stack precisely.

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive Web UI

### Backend

* Web application backend
* Authentication
* User management
* Item management
* Messaging
* Administrative APIs

### Database

* Persistent database for users, items, messages, and recovery records

### Deployment

* **Render**

---

## 📁 Suggested Project Structure

```text
lost_item_recovery/
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── pages/
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── services/
│
├── database/
│
├── uploads/
│
├── .env
├── .gitignore
├── README.md
└── ...
```

> Replace this structure with your repository's actual folder structure if it differs.

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/DurgaPraveen07/lost_item_recovery.git
```

### 2. Navigate to the Project

```bash
cd lost_item_recovery
```

### 3. Install Dependencies

Use the package manager corresponding to the project's backend/frontend.

For example:

```bash
npm install
```

or

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file and configure the required application credentials.

Example:

```env
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
```

Do **not** commit sensitive credentials to GitHub.

### 5. Start the Application

Use the project's configured development command.

Example:

```bash
npm run dev
```

---

## 🌐 Deployment

The application is currently deployed using **Render**.

### Deployment Flow

```text
GitHub Repository
       │
       ▼
    Render
       │
       ▼
Build & Deploy
       │
       ▼
Live Application
       │
       ▼
lost-item-recovery.onrender.com
```

---

## 🔒 Security Considerations

The system handles user and campus-related information, so production deployments should consider:

* Secure password storage
* Authentication and authorization
* Input validation
* Secure environment variables
* HTTPS
* Access control for administrator functions
* Protection of student information
* Secure messaging
* Database access controls
* File-upload validation

---

## 🎯 Future Enhancements

Potential future improvements include:

* 🤖 AI-powered lost/found item matching
* 📍 Interactive campus map
* 🔔 Real-time notifications
* 📧 Automated email notifications
* 📱 Progressive Web App / mobile application
* 🔎 Advanced item search
* 🧠 Image-based item similarity detection
* 📈 Advanced recovery analytics
* 📊 Admin reporting and data visualization
* 🔐 Role-based access control
* ☁️ Cloud-based image storage
* 📱 QR-based item identification

---

## 🏫 Intended Environment

The system is designed specifically for **educational institutions**, where large numbers of students and staff interact within a defined campus environment.

It can be adapted for:

* Colleges
* Universities
* Schools
* Corporate campuses
* Hostels
* Large organizations
* Public institutions

---

## 👥 Contributors

### Development Team

**Durga Praveen07**
GitHub: https://github.com/DurgaPraveen07

**Sasi Vardhan**

---

## 📜 License

This project is developed as an institutional/academic project for **Dhanekula Institute of Engineering & Technology**.

Add an appropriate open-source license if you intend to make the project available for external use.

---

## ⭐ Project Highlights

```text
✓ Centralized Lost & Found Platform
✓ Lost Item Reporting
✓ Found Item Reporting
✓ Student Profile Management
✓ ID Card Recovery Workflow
✓ Secure Messaging
✓ Admin Dashboard
✓ Live Item Tracking
✓ Recovery Analytics
✓ Official Resolution Records
✓ PDF Resolution Receipts
✓ Cloud Deployment
```

---

## 📌 Project Status

🟢 **Deployed**

The application is currently available online and provides the core lost-and-found management workflow for the institution.

**Live:** https://lost-item-recovery.onrender.com/

---

## 💡 Vision

> **"Making lost-item recovery faster, more transparent, and digitally accessible across campus."**

The goal of the project is to transform the traditional lost-and-found process into a centralized digital recovery ecosystem where students, staff, and administrators can collaborate efficiently.
