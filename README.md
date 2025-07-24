# TaxiTap 🚕

<div align="center">
  <img src="assets/images/taxi.gif" alt="TaxiTap Animation" width="150" height="150"/>
  
  **Revolutionizing South Africa's Minibus Taxi Industry**
  
  *A modern mobile platform that digitizes route information, eliminates constant hooting, and creates a semi-structured booking system while preserving the flexibility that makes taxis essential.*

  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![GitHub issues](https://img.shields.io/github/issues/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/issues)
  [![codecov](https://codecov.io/gh/COS301-SE-2025/TaxiTap/branch/main/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2025/TaxiTap)
  [![Build Status](https://img.shields.io/github/actions/workflow/status/COS301-SE-2025/TaxiTap/platform.yml?branch=main)](https://github.com/COS301-SE-2025/TaxiTap/actions)
  [![Dependencies](https://img.shields.io/librariesio/github/COS301-SE-2025/TaxiTap)](https://libraries.io/github/COS301-SE-2025/TaxiTap)
  
  [![Languages](https://img.shields.io/github/languages/count/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
  [![Top Language](https://img.shields.io/github/languages/top/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
  [![Repo Size](https://img.shields.io/github/repo-size/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
  [![Pull Requests](https://img.shields.io/github/issues-pr/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/pulls)
  [![Last Commit](https://img.shields.io/github/last-commit/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/commits)
  [![Commit Activity](https://img.shields.io/github/commit-activity/m/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/graphs/commit-activity)

  **[📋 Project Board](https://github.com/orgs/COS301-SE-2025/projects/265/views/1)** • **[📖 Documentation](docs/)** • **[🌐 Website](http://gititdone2025.site)**
</div>

---

## 🎯 Project Overview

TaxiTap is a revolutionary mobile platform designed to transform South Africa's minibus taxi industry. Our solution bridges the gap between traditional taxi operations and modern technology, creating a seamless experience for both passengers and operators.

### Key Features
- **📍 Location-Aware Requests** - Smart taxi booking based on real-time location
- **📱 Real-Time Tracking** - Live vehicle location and route updates
- **🔄 Flexible Routing** - Maintains the multi-passenger, flexible nature of traditional taxis
- **🚫 No More Hooting** - Digital communication eliminates noise pollution
- **⭐ Rating System** - Driver and passenger rating system for quality assurance

## 📋 Project Documentation

### 📊 Demo 1
| Resource | Link |
|----------|------|
| **🎥 Presentation** | [Watch Video](https://drive.google.com/file/d/1ARU9fvIyPMoXSzPPKUsij37qSIwM2xVQ/view?usp=drive_link) |
| **🚀 Live Demo** | [Watch Video](https://drive.google.com/file/d/1LZjudVO8O2SHSQI3N5NrFANh6n-567mr/view?usp=drive_link) |
| **📄 SRS Document** | [View PDF](docs/SRS.pdf) |

### 📊 Demo 2
| Resource | Link |
|----------|------|
| **🎥 Presentation** | [Watch Video](https://drive.google.com/file/d/1Drq_TwIEtVKRozfLV-BxJGurt6ZTwGnA/view?usp=sharing) |
| **🚀 Live Demo** | [Watch Video](https://drive.google.com/file/d/11mDZAy1Mt7-55KsPhjvOCNG1LzdTNvwG/view?usp=sharing) |
| **📄 SRS Document** | [View PDF](docs/SRS%20Demo%202.pdf) |
| **🏗️ Architecture Document** | [View PDF](docs/Architectural%20Requirements.pdf) |
| **📝 Coding Standards** | [View PDF](docs/Coding%20Standards.pdf) |
| **📖 User Manual** | [View PDF](docs/Taxi%20Tap%20User%20Manual.pdf) |

---

## 🛠️ Technology Stack

<div align="center">
  
  | **Layer** | **Technology** | **Purpose** |
  |-----------|----------------|-------------|
  | **Frontend** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white) | Cross-platform mobile development |
  | **Backend** | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Convex](https://img.shields.io/badge/Convex-FF6B6B?style=for-the-badge&logo=convex&logoColor=white) | Serverless backend with real-time capabilities |
  | **Database** | ![Convex](https://img.shields.io/badge/Convex_DB-FF6B6B?style=for-the-badge&logo=convex&logoColor=white) | Document-oriented database with real-time sync |
  | **Hosting** | ![Convex Cloud](https://img.shields.io/badge/Convex_Cloud-FF6B6B?style=for-the-badge&logo=convex&logoColor=white) ![Expo](https://img.shields.io/badge/Expo_Cloud-000020?style=for-the-badge&logo=expo&logoColor=white) | Cloud infrastructure and OTA updates |

</div>

### 📱 Frontend: Expo (React Native with TypeScript)
- **Cross-platform development** for Android, iOS, and web
- **Fast iteration** with Expo Go for development
- **Native features** including GPS, camera, push notifications, and QR scanning
- **Modern UI components** with responsive design

### ⚡ Backend: Convex (TypeScript Serverless)
- **Real-time reactive backend** with automatic data synchronization
- **Built-in authentication** and user management
- **Scheduled functions** for background tasks
- **Business logic** handling ride requests, GPS updates, and notifications

### 🗄️ Database: Convex Document-Oriented Database
- **Schema-defined collections** (`users`, `rides`, `taxis`, `routes`)
- **Relational support** via `v.id()` references
- **Real-time subscriptions** for live data updates
- **Automatic indexing** and query optimization

### ☁️ Hosting: Convex Cloud (Managed)
- **Serverless deployment** with automatic scaling
- **Built-in CI/CD** with `convex deploy`
- **No infrastructure management** required
- **Frontend hosting** via Expo Cloud and app stores

---



## 🔄 Development Workflow

### 🌿 Branching Strategy: GitFlow
```
main           ──────●──────●──────●──────●─────► (Production)
                      │      │      │      │
develop        ──●────┼──●───┼──●───┼──●───┼─────► (Development)
                 │    │  │   │  │   │  │   │
feature/login    ●────┘  │   │  │   │  │   │
                         │   │  │   │  │   │
feature/payment  ────────●───┘  │   │  │   │
                                │   │  │   │
hotfix/critical  ───────────────●───┘  │   │
                                       │   │
release/v1.0     ──────────────────────●───┘
```

**Branch Types:**
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New feature development
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation

---

## 👥 Team: Git It Done

<div align="center">
  <a href="http://gititdone2025.site">
    <img src="assets/images/Logo_nobg.png" alt="Git It Done Logo" width="200"/>
  </a>
</div>

<table align="center">
  <tr>
    <td align="center" width="250">
      <img src="assets/images/annie.png" width="120" height="120" style="border-radius: 50%"/>
      <br><br>
      <strong>Ann-Marí Oberholzer</strong>
      <br>
      <em>Project Manager</em>
      <br><br>
      <a href="https://github.com/Ann-Mari-Oberholzer">
        <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
      </a>
      <br>
      <a href="https://linkedin.com/ann-mari-oberholzer-967982354/">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
      </a>
    </td>
    <td align="center" width="250">
      <img src="assets/images/unathi.png" width="120" height="120" style="border-radius: 50%"/>
      <br><br>
      <strong>Unathi Dlamini</strong>
      <br>
      <em>Backend Engineer</em>
      <br><br>
      <a href="https://github.com/un4thi">
        <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
      </a>
      <br>
      <a href="https://linkedin.com/unathi-dlamini-237007224/">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="250">
      <img src="assets/images/tebogo.png" width="120" height="120" style="border-radius: 50%"/>
      <br><br>
      <strong>Moyahabo Hamese</strong>
      <br>
      <em>Frontend Engineer</em>
      <br><br>
      <a href="https://github.com/habohamese">
        <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
      </a>
      <br>
      <a href="https://www.linkedin.com/in/moyahabo-hamese/">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
      </a>
    </td>
    <td align="center" width="250">
      <img src="assets/images/nev.png" width="120" height="120" style="border-radius: 50%"/>
      <br><br>
      <strong>Nevan Rahman</strong>
      <br>
      <em>Fullstack/Data Engineer</em>
      <br><br>
      <a href="https://github.com/rsnevan">
        <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
      </a>
      <br>
      <a href="https://linkedin.com/in/nevanrahman">
        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
      </a>
    </td>
  </tr>
</table>

### Team Member Profiles

<details>
<summary><strong>Ann-Marí Oberholzer - Project Manager</strong></summary>
<br>
As a third-year Computer Science student, I have gained a strong foundation in the various areas of the field through both coursework and hands-on experience. I have experience in programming languages such as Java and C++, allowing me to tackle backend development. In addition to the previously mentioned, I also know of web technologies - including HTML, CSS, JavaScript, PHP and React. Having served as a team leader in previous projects, I was assigned the leadership role for this project as well. I'm excited to further develop my leadership abilities while guiding the team toward success. Throughout my studies, various team projects have allowed me to enhance my teamwork and communication skills. This has also given me the chance to adapt in diverse group settings. I am eager to expand my programming knowledge further and believe my mindset makes me a good asset to the team.
</details>

<details>
<summary><strong>Unathi Dlamini - Backend Engineer</strong></summary>
<br>
A third-year Computer Science student at the University of Pretoria with a strong passion for programming, web design, and continuous learning. I enjoy working in teams, tackling challenges collaboratively, and expanding my skill set through hands-on projects. Currently exploring areas like cybersecurity and software engineering, I'm always eager to take on new technologies and improve both my technical and problem-solving abilities.
</details>

<details>
<summary><strong>Moyahabo Hamese - Frontend Engineer</strong></summary>
<br>
I am a Computer Science student interested in front-end development and cybersecurity. I enjoy working in collaborative teams and solving real-world problems through thoughtful and practical solutions. My experiences include, but are not limited to: (1) contributing to a community sensor project for education, (2) engaging with the UP Consulting Society to tackle case-based challenges, and (3) designing applications that provide users with a positive and intuitive experience. Passionate about continuous learning and innovation, I bring a balance of technical skills, creativity, and a problem-solving mindset to every project.
</details>

<details>
<summary><strong>Nevan Rahman - Fullstack/Data Engineer</strong></summary>
<br>
As a final-year BSc Computer Science (with Data Science) student, I combine technical proficiency with strong leadership skills developed through my role as a Senior Team Lead in a university IT Lab. I excel in handling client issues while maintaining complex IT environments. My expertise spans Frontend Development, Backend Systems, API Integration, and Data Science with a focus on creating responsive web applications. I've collaborated on diverse projects that have sharpened my technical abilities across various development environments. I'm known for exceptional communication skills and a team-oriented work ethic, consistently putting in the necessary effort to achieve success. My passion lies in software architecture, full-stack development, database technologies, and machine learning applications.
</details>



## ✨ Features

### 🎯 Current Features
- ✅ **Real-time taxi tracking** with live GPS updates
- ✅ **Trip history and receipts** for record keeping
- ✅ **Driver and passenger ratings** for quality assurance
- ✅ **Push notifications** for ride updates and alerts

### 🚀 Upcoming Features
- 🔄 **Multi-language support** for diverse user base
- 🔄 **Advanced analytics** for operators and passengers

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

### Installation

```bash
# Clone the repository
git clone https://github.com/COS301-SE-2025/TaxiTap.git

# Navigate to project directory
cd TaxiTap

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# Start Expo development server
expo start

# Run on Android
expo run:android

# Run on iOS
expo run:ios

# Run on web
expo start --web
```

### Configuration
1. Set up your Convex backend configuration
2. Configure environment variables
3. Set up authentication providers

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Made with ❤️ by Team Git It Done</strong>
  <br>
  <em>Transforming South Africa's transportation landscape, one tap at a time.</em>
</div>
