# Project Workspace Manager (PWM)

A production-ready, 100% offline-first desktop application for managing private project workspaces. PWM provides full project isolation, client approval flows, deliverable version tracking, rich text notes, task management, global offline search, local automated backups, reports, and a production-ready automatic update system powered by `electron-updater` and GitHub Releases.

---

## 🚀 Key Features

- **Project Workspaces**: Isolated hubs for individual projects featuring dedicated tabs for Overview, Todos, Deliverables, Client Approvals, Files, Notes, Timeline, Activity Logs, and settings.
- **100% Offline-First Architecture**: Uses a local SQLite database driven by Prisma ORM. No external network connections required for core functionality.
- **Automatic Background Updates**: Production-ready `electron-updater` integration connected to GitHub Releases with real-time UI status notifications, download progress bar (%), release notes, and silent background checks.
- **Automated CI/CD & Releases**: Single-command version release script (`npm run release`) paired with GitHub Actions to automate versioning, Git tagging, installer compilation (`.exe`), blockmap generation, and GitHub Release asset uploads.
- **Modern Desktop UI**: Built with React 19, Vite, Tailwind CSS v4, and Shadcn UI components.
- **State Management**: Zustand stores map directly to clean IPC communications with the Electron backend.
- **Dashboard Analytics**: Rich visual metrics, status trackers, and interactive Recharts data visualization.
- **Local File & PDF Management**: Secure file upload, storage, and custom PDF generation using `pdf-lib` and Electron's Native File System API.
- **Backup & Restore**: Encrypted ZIP-based backups to preserve all data locally.

---

## 📂 Folder Structure

The repository is structured following clean architectural boundaries between the Electron Main (backend), Preload (security bridge), and Renderer (frontend React app) processes.

```
MY CRM/
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions workflow for automated releases
│
├── prisma/                       # SQLite & database schema
│   ├── dev.db                    # Local SQLite Database (auto-generated)
│   ├── schema.prisma             # Prisma ORM Database Models
│   └── migrations/               # Database schema versioning & SQL scripts
│
├── scripts/
│   ├── build-prod-db.js          # Production template database builder
│   └── release.js                # Automated version bump, git tagging & push script
│
├── src/
│   ├── main/                     # Electron Main Process (Node.js backend)
│   │   ├── index.ts              # Electron startup, window creation & app lifecycle
│   │   ├── database.ts           # SQLite & Prisma Client connection & seeding
│   │   └── ipc/                  # Domain-specific IPC handlers (handles communications)
│   │       ├── index.ts          # Central IPC handler registration
│   │       ├── projects.ipc.ts   # CRUD operations for Projects
│   │       ├── todos.ipc.ts      # Task and Todo management operations
│   │       ├── deliverables.ipc.ts # PDF upload, link, download operations
│   │       ├── approvals.ipc.ts  # Client review states (approve/reject/resubmit)
│   │       ├── files.ipc.ts      # Main-process local disk file storage APIs
│   │       ├── notes.ipc.ts      # Project-specific note taking handlers
│   │       ├── activity.ipc.ts   # Main logging and activity feed actions
│   │       ├── reports.ipc.ts    # PDF/CSV report compiler processes
│   │       ├── notifications.ipc.ts # Deadline monitoring & background alerts
│   │       ├── backup.ipc.ts     # ZIP archiver export & import restore tools
│   │       ├── settings.ipc.ts   # Local settings persistence
│   │       └── update.ipc.ts     # electron-updater initialization & IPC handlers
│   │
│   ├── preload/                  # Secure Preload Bridge
│   │   └── index.ts              # contextBridge API exposing safe methods to frontend
│   │
│   └── renderer/                 # React Frontend (Vite + Tailwind CSS v4)
│       ├── index.html            # Web app entry markup template
│       ├── main.tsx              # React mounting root execution
│       ├── App.tsx               # Main layout wrapper & React Router config
│       │
│       ├── components/           # Reusable UI components
│       │   ├── layout/           # Sidebar, Navigation Bar, Breadcrumbs
│       │   └── shared/           # ConfirmDialog, Badges, Loading, EmptyState
│       │
│       ├── modules/              # Domain-specific pages and logic
│       │   ├── dashboard/        # Metrics charts & overview widgets
│       │   ├── projects/         # Table views, project forms & search filters
│       │   ├── workspace/        # Isolated tabs (Overview, Todos, Deliverables...)
│       │   ├── reports/          # Report compiler pages
│       │   ├── notifications/    # Notifications directory & lists
│       │   ├── backup/           # Backup triggers & import settings
│       │   └── settings/         # Themes, security, SMTP, and Updates & About page
│       │
│       ├── stores/               # Zustand Global State Managers
│       │   ├── useProjectStore.ts # Projects directory status state
│       │   ├── useTodoStore.ts   # Active workspace tasks state
│       │   ├── useNotificationStore.ts # Global notifications queue state
│       │   ├── useSettingsStore.ts # Application custom configuration state
│       │   └── useUIStore.ts     # Light/Dark/System theme selection
│       │
│       ├── lib/                  # Utilities (Tailwind merge cn, date-fns formats)
│       ├── styles/               # globals.css styling system & dark mode rules
│       └── types/                # Typescript definition schemas
│
├── electron.vite.config.ts       # Bundler configuration (main, preload, renderer)
├── dev-app-update.yml            # Dev-mode electron-updater configuration
├── package.json                  # Dependencies, dev dependencies, scripts & electron-builder config
└── tsconfig.json                 # TypeScript compiler mapping
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Install Project Dependencies
Run the following command in your terminal to install packages:
```bash
npm install
```

### 3. Generate Database Client & Run Migrations
Run the initial Prisma migration command to set up your SQLite database tables locally:
```bash
npx prisma migrate dev --name init
```
This command automatically creates:
- `prisma/dev.db` (The local database file)
- `prisma/migrations/` (The SQL migrations history)
- Autogenerated typed Prisma Client inside `node_modules`

---

## 🖥️ Running & Building

### Run in Development Mode
Launch Vite's hot-reload compiler and open the Electron application locally:
```bash
npm run dev
```

### Compile & Build Production Bundles
Verify compilation and compile assets for Main, Preload, and Renderer processes:
```bash
npm run build
```

### Package Distributables Locally
To package standalone installers locally for specific platforms:
```bash
# Windows (.exe installer)
npm run build:win

# macOS (.dmg installer)
npm run build:mac

# Linux (.AppImage installer)
npm run build:linux
```

---

## 🔄 Automatic Updates & Releases

The application uses **`electron-updater`** connected to **GitHub Releases** (`Pritish229/Projectmanager`).

### 1. How Updates Work for End Users
- **Silent Background Check**: Automatically checks for updates 5 seconds after app startup.
- **Manual Check**: Users can navigate to **Settings > Updates & About** and click **Check for Updates**.
- **Real-Time UI Notifications**:
  - Displays **Current Version** vs **Latest Version**.
  - Displays formatted **Release Notes**.
  - Asks: `"A new version is available. Download now?"` (with **Download Now** button).
  - Shows background **Download Progress Bar (%)**.
  - Asks: `"Update downloaded. Restart now to install?"` (with **Restart and Install** button).
  - Clicking **Restart and Install** calls `autoUpdater.quitAndInstall()`, updating the binary silently without touching user database files.

### 2. How to Publish a Release (Single Command)
To bump the app version and publish a release automatically to GitHub:

```bash
# Bump patch version (e.g. 1.0.4 -> 1.0.5), commit, tag v1.0.5, and push to GitHub:
npm run release

# Or bump minor version (e.g. 1.0.4 -> 1.1.0):
npm run release minor

# Or specify an explicit version:
npm run release 1.0.6
```

#### What `npm run release` Automatically Handles:
1. Updates `package.json` and `update.json` version numbers.
2. Commits the updated version files (`git commit -m "release: v1.0.5"`).
3. Creates the Git tag (`v1.0.5`).
4. Pushes commits and tags to GitHub (`git push origin main --tags`).
5. Triggers **GitHub Actions** (`.github/workflows/release.yml`), which compiles the `.exe`, `latest.yml`, and `.blockmap` files and attaches them to the GitHub Release automatically.

---

## 🔒 SQLite Database Preservation Guarantee

> [!IMPORTANT]
> The SQLite database file resides strictly inside the user's application data directory at `app.getPath('userData')/data/pwm.db`. Application updates replace only the application binary bundle (`app.asar` and resources). User database files and uploaded project assets are **never overwritten, deleted, or altered** during app updates.

---

## 📖 How to Use the Application

### 1. Dashboard
- **Analytics View**: Displays summary counts for active projects, deliverables pending client approvals, overdue tasks, and monthly statistics.
- **Interactive Charts**:
  - *Project Status Tracker* (Donut chart showing percentages of active vs draft vs closed projects).
  - *Todo Completion History* (Bar chart detailing completed tasks).
- **Recent Activities**: A real-time timeline displaying recent adjustments made to any project.

### 2. Projects Module
- **Project Directory**: Displays all projects in a data table with options to sort by deadline, status, and priority.
- **Search & Filters**: Search projects by name, code, or tags. Filter by priority or archive status.
- **Create & Edit**: A slide-over form to register client info, set deadlines, write project scopes, and tag projects.
- **Archive/Close Actions**: Closed projects enter a safe read-only state.

### 3. Isolated Project Workspace (Tabbed Interface)
Selecting any project opens its dedicated workspace containing:
- **Overview**: High-level progress bar, task status breakdown, target deadline, and client details.
- **Todos (Tasks)**: Drag-reorder, create checklist items, duplicate recurring tasks, assign priorities, and bulk complete tasks.
- **Deliverables**: Manage PDF uploads, auto-generate PDF summary scopes, link relevant todo tasks, and track document versions.
- **Approvals**: Log client responses (Approved, Rejected, Resubmit) along with comments for version control.
- **Files**: Drag-and-drop file manager using the local filesystem. Preview images and PDFs inside the app.
- **Notes**: Text editor for workspace guides, specifications, and scratchpads.
- **Timeline**: A Gantt-like milestone tracker spanning deliverables and approval timelines.
- **Activity Log**: Audit log history of every action taken inside the project workspace.

### 4. Backups & Restore
- Manually trigger backup files exported as standard ZIP packages.
- Restores all database records and uploaded workspace files by choosing an existing backup zip.
- Configure automatic backups in settings.

### 5. Settings & Customization
- **Theme**: Swap instantly between Light Mode, Dark Mode, or System settings.
- **Email Profiles**: Manage SMTP profiles with step-by-step setup guides for Gmail, Outlook, Yahoo, and Custom webmail.
- **Invoice Templates**: Customize pre-built themes or design custom invoice layouts.
- **Updates & About**: Check for application updates, view release notes, and install updates.
