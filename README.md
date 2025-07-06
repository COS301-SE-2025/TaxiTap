# TaxiTap

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/issues)
[![codecov](https://codecov.io/gh/COS301-SE-2025/TaxiTap/branch/main/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2025/TaxiTap)
[![Dependencies](https://img.shields.io/librariesio/github/COS301-SE-2025/TaxiTap)](https://libraries.io/github/COS301-SE-2025/TaxiTap)
[![Build Status](https://img.shields.io/github/actions/workflow/status/COS301-SE-2025/TaxiTap/platform.yml?branch=main)](https://github.com/COS301-SE-2025/TaxiTap/actions)
[![Languages](https://img.shields.io/github/languages/count/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
[![Top Language](https://img.shields.io/github/languages/top/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
[![Repo Size](https://img.shields.io/github/repo-size/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap)
[![Pull Requests](https://img.shields.io/github/issues-pr/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/commits)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/COS301-SE-2025/TaxiTap)](https://github.com/COS301-SE-2025/TaxiTap/graphs/commit-activity)

## Project Description

<p align="center">
    <img src="assets/images/taxi.gif" height="100"/>
</p>

*TaxiTap* - is a mobile platform designed to revolutionise South Africa's minibus taxi industry by digitising route information, eliminating the need for constant hooting, and creating a semi-structured booking system while preserving the flexibility that makes taxis an essential transport mode.  
The system connects passengers and taxi operators through a location-aware mobile application that facilitates taxi requests, communicates passenger locations, manages payments, and provides real-time vehicle tracking – all without fundamentally changing the existing system's multi-passenger, flexible route nature.

## Team: Git It Done

<p align="center">
  <a href="http://gititdone2025.site">
    <img src="assets/images/Logo_nobg.png" alt="Git It Done Logo" width="200"/>
  </a>
</p>

- [Functional Requirements (SRS)](docs/SRS%20Demo%202.pdf)
- [GitHub Project Board](https://github.com/orgs/COS301-SE-2025/projects/137/views/1)

## Demo 1

### Presentation:
[Watch the Presentation Video](https://drive.google.com/file/d/1ARU9fvIyPMoXSzPPKUsij37qSIwM2xVQ/view?usp=drive_link)

### Live Demo:
[Watch the Live Demo Video](https://drive.google.com/file/d/1LZjudVO8O2SHSQI3N5NrFANh6n-567mr/view?usp=drive_link)

### SRS Document:
[Functional Requirements (SRS)](docs/SRS.pdf)

## Demo 2

### Presentation:
[Watch the Presentation Video](https://drive.google.com/file/d/1Drq_TwIEtVKRozfLV-BxJGurt6ZTwGnA/view?usp=sharing)

### Live Demo:
[Watch the Live Demo Video](https://drive.google.com/file/d/11mDZAy1Mt7-55KsPhjvOCNG1LzdTNvwG/view?usp=sharing)

### SRS Document:
[Functional Requirements (SRS)](docs/SRS%20Demo%202.pdf)

### Architectural Requirements Document:
[Architectural Requirements](docs/Architectural%20Requirements.pdf)

### Coding Standards Document:
[Coding Standards](docs/Coding%20Standards.pdf)

### User Manual:
[User Manual](docs/Taxi%20Tap%20User%20Manual.pdf)

## Technology Stack

### Frontend:
- **Expo (React Native with TypeScript)**  
  For cross-platform web and mobile development (Android + iOS).  
  Fast iteration with Expo Go. Supports native features like GPS, camera, push notifications, and QR scanning.

### Backend:
- **Convex (TypeScript Serverless Backend)**  
  Real-time reactive backend with built-in functions, scheduling, authentication, and automatic data syncing.  
  Supports business logic like ride requests, GPS updates, seat tracking, and notifications.

### Database:
- **Convex Document-Oriented Database**  
  Schema-defined collections (e.g. `users`, `rides`, `taxis`, `routes`).  
  Supports relations via `v.id()` references and real-time subscriptions for live data updates.

### Hosting:
- **Convex Cloud (Managed)**  
  Backend and database are deployed to Convex’s cloud infrastructure.  
  No need for containers, VMs, or Kubernetes. Built-in CI/CD with `convex deploy`.

  Frontend hosted via:
  - **Expo Cloud** for over-the-air updates
  - **Play Store & App Store** for production builds

## Branching Strategy: `GitFlow`
- `main`: Production code  
- `develop`: Development code  
- `feature/*`: New features  
- `hotfix/*`: Urgent fixes  
- `release/*`: Release preparation

## Team Members & Roles

| Photo | Name | Role | GitHub | LinkedIn | Description |
|-------|------|------|--------|----------|-------------|
| ![](assets/images/annie.jpeg) | **Ann-Marí Oberholzer** | Project Manager | [GitHub](https://github.com/Ann-Mari-Oberholzer) | [LinkedIn](https://linkedin.com/ann-mari-oberholzer-967982354/) | As a third-year Computer Science student, I have gained a strong foundation in the various areas of the field through both coursework and hands-on experience. I have experience in programming languages such as Java and C++, allowing me to tackle backend development. In addition to the previously mentioned, I also know of web technologies - including HTML, CSS, JavaScript, PHP and React. Having served as a team leader in previous projects, I was assigned the leadership role for this project as well. I'm excited to further develop my leadership abilities while guiding the team toward success. Throughout my studies, various team projects have allowed me to enhance my teamwork and communication skills. This has also given me the chance to adapt in diverse group settings. I am eager to expand my programming knowledge further and believe my mindset makes me a good asset to the team. |
| ![](assets/images/unathi.jpeg) | **Unathi Dlamini** | Backend Engineer | [GitHub](https://github.com/un4thi) | [LinkedIn](https://linkedin.com/unathi-dlamini-237007224/) | A third-year Computer Science student at the University of Pretoria with a strong passion for programming, web design, and continuous learning. I enjoy working in teams, tackling challenges collaboratively, and expanding my skill set through hands-on projects. Currently exploring areas like cybersecurity and software engineering, I'm always eager to take on new technologies and improve both my technical and problem-solving abilities. |
| ![](assets/images/tebogo.jpg) | **Moyahabo Hamese** | Frontend Engineer | [GitHub](https://github.com/habohamese) | [LinkedIn](https://www.linkedin.com/in/moyahabo-hamese/) | I am a Computer Science student interested in front-end development and cybersecurity. I enjoy working in collaborative teams and solving real-world problems through thoughtful and practical solutions. My experiences include, but are not limited to: (1) contributing to a community sensor project for education, (2) engaging with the UP Consulting Society to tackle case-based challenges, and (3) designing applications that provide users with a positive and intuitive experience. Passionate about continuous learning and innovation, I bring a balance of technical skills, creativity, and a problem-solving mindset to every project. |
| ![](assets/images/nev.jpg) | **Nevan Rahman** | Fullstack/Data Engineer | [GitHub](https://github.com/rsnevan) | [LinkedIn](https://linkedin.com/in/nevanrahman) | As a final-year BSc Computer Science (with Data Science) student, I combine technical proficiency with strong leadership skills developed through my role as a Senior Team Lead in a university IT Lab. I excel in handling client issues while maintaining complex IT environments. My expertise spans Frontend Development, Backend Systems, API Integration, and Data Science with a focus on creating responsive web applications. I've collaborated on diverse projects that have sharpened my technical abilities across various development environments. I'm known for exceptional communication skills and a team-oriented work ethic, consistently putting in the necessary effort to achieve success. My passion lies in software architecture, full-stack development, database technologies, and machine learning applications.  |

## Features (Planned)
- Real-time taxi tracking  
- Secure in-app payments  
- Trip history and receipts  
- Driver ratings and reviews  

## Getting Started
Coming soon
