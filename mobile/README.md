# ARCOS Mobile App ⚡
> **Personal Financial Intelligence System — React Native / Expo Client**  
> *Developed by Stark Techno*

This directory contains the cross-platform mobile application for ARCOS, built with **React Native 0.76**, **Expo SDK 52**, **Expo Router v4**, and **NativeWind v4** (Tailwind CSS).

---

## 📱 Features

- **Home Dashboard**: Quick spending overview (Today / This Month), quick-add expense action card, and 1-tap JARVIS shortcut.
- **JARVIS Assistant**: Chat with JARVIS to log transactions naturally and analyze your finances with interactive confirmation cards.
- **Expenses**: Comprehensive expense log with filters, search, and category grouping.
- **Budgets**: Monthly budgets with real-time utilization progress bars and threshold warnings (80% warning / 100% exceeded).
- **Investments & Stocks**: Track Stocks, Mutual Funds, ETFs, and IPO allotments with market quotes.
- **Bike Tracker**: Log fuel fills, calculate accurate mileage (km/L), and track vehicle service/maintenance.
- **Goals & Analytics**: Savings goal progress meters and category distribution charts.
- **Offline Mode**: Queue transactions when internet is unavailable and sync them automatically once restored.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.x or 20.x LTS ([Download Node.js](https://nodejs.org/))
- npm or yarn
- **Expo Go** app installed on your physical device (available on App Store and Google Play), OR an Android Studio Emulator / Xcode Simulator.

---

### 2. Installation

```bash
cd mobile
npm install
```

---

### 3. Backend Endpoint Configuration

Create a `.env` file in the `mobile/` root:

```ini
EXPO_PUBLIC_API_URL=http://<YOUR_HOST_IP>:8000/api/v1
```

#### Choosing the right IP:
| Target Device | URL to use | Notes |
|---|---|---|
| **Physical Phone (Expo Go)** | `http://192.168.x.x:8000/api/v1` | Use your computer's local Wi-Fi IPv4 address. Computer and phone must share the same Wi-Fi. |
| **Android Emulator** | `http://10.0.2.2:8000/api/v1` | `10.0.2.2` automatically routes to host machine `localhost`. |
| **iOS Simulator** | `http://localhost:8000/api/v1` | Shares network stack with host. |
| **Web Browser** | `http://localhost:8000/api/v1` | |

*Tip: To find your local IP on Windows, run `ipconfig` and look for the IPv4 Address under Wireless LAN adapter.*

---

### 4. Running the App

Start the Expo development server:

```bash
npm start
```

In the interactive terminal:
- Scan the **QR Code** using your phone's camera (iOS) or the **Expo Go** app (Android).
- Press **`a`** to open in an Android Emulator.
- Press **`i`** to open in an iOS Simulator (macOS only).
- Press **`w`** to open in a Web browser.

---

## 📂 Codebase Structure

```
mobile/
├── app/                        # Expo Router screen tree
│   ├── (auth)/                 # Authentication routes
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # ARCOS Login screen
│   │   └── register.tsx        # ARCOS Registration screen
│   ├── (tabs)/                 # Bottom tab navigation
│   │   ├── _layout.tsx         # Tab bar configuration (Home, Expenses, Investments, Bike, JARVIS)
│   │   ├── index.tsx           # Home Dashboard
│   │   ├── expenses/           # Expenses list, details, add expense
│   │   ├── investments/        # Stock, mutual fund, IPO tracker
│   │   ├── bike/               # Mileage & vehicle maintenance
│   │   └── chat.tsx            # JARVIS AI chat interface
│   ├── analytics.tsx           # Detailed spending trends
│   ├── budgets/                # Monthly budget setup & alerts
│   ├── goals/                  # Savings milestones
│   └── _layout.tsx             # Root layout with QueryClient & Auth providers
│
├── src/
│   ├── api/                    # Axios API client functions for each resource
│   ├── stores/                 # Zustand global stores:
│   │   ├── authStore.ts        # Auth session, JWT tokens, user profile
│   │   └── offlineStore.ts     # Offline transaction queue & auto-sync
│   ├── types/                  # Shared TypeScript interfaces
│   └── utils/
│       ├── constants.ts        # Color palette & default API endpoint
│       └── formatting.ts       # Indian Rupee (₹) currency & date formatting
│
├── app.json                    # Expo configuration (name, slug, bundle IDs)
├── tailwind.config.js          # NativeWind Tailwind theme
└── package.json
```

---

## 📶 Offline Mode & State Architecture

ARCOS incorporates an offline-first resilient architecture:
1. **Network Detection & Failure Catching**: If an API call fails due to a network drop, `offlineStore` queues the payload locally using `AsyncStorage`.
2. **Optimistic Updates**: TanStack React Query invalidates cached lists immediately, keeping the UI snappy.
3. **Reconnection Synchronization**: Once a healthy connection is established, pending actions are dispatched and reconciled automatically.

---

## 📦 Building with EAS (Expo Application Services)

The app is pre-configured for cloud builds with EAS:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build Android APK / AAB
eas build -p android --profile preview

# Build iOS Archive
eas build -p ios --profile preview
```
