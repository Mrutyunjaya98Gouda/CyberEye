# Subdomain Sentinel (CyberEye)

**Advanced Attack Surface Intelligence Platform**

A production-grade subdomain reconnaissance platform for security professionals. Enumerate, analyze, and monitor attack surfaces with advanced intelligence.

---

## Features

- 🎯 **Subdomain Enumeration**: Comprehensive subdomain discovery
- 📊 **Real-time Analytics**: Live statistics and progress tracking
- 🔍 **Anomaly Detection**: Identify suspicious patterns
- ☁️ **Cloud Asset Tracking**: AWS, Azure, and GCP detection
- 🛡️ **Takeover Detection**: Identify vulnerable subdomains
- 📈 **Multiple Views**: Table, Graph, and JSON visualization
- 🤖 **AI Assistant**: Intelligent analysis and insights
- 📄 **Report Generation**: Professional PDF reports
- 💾 **Scan History**: Save and compare scans
- 🔐 **Authentication**: Secure user accounts with Supabase

---

## Technology Stack

- **Frontend**: React 18.3 + TypeScript 5.8
- **Build Tool**: Vite 5.4
- **UI Framework**: Tailwind CSS + shadcn-ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack Query
- **Visualization**: D3.js + Recharts

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating) (recommended)

### Setup

```bash
# Clone the repository
git clone <your-repository-url>

# Navigate to the project directory
cd subdomain-sentinel-main

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and update with your Supabase credentials
cp .env.example .env

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080/`

---

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

---

## Project Structure

```
subdomain-sentinel-main/
├── src/
│   ├── pages/           # Application pages
│   ├── components/      # Reusable React components
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase integration
│   ├── lib/             # Utility libraries
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── supabase/            # Supabase functions and configuration
└── dist/                # Production build output
```

---

## Usage

1. **Start a Scan**: Enter a target domain in the scan input
2. **View Results**: Analyze discovered subdomains in table, graph, or JSON format
3. **Filter Data**: Use advanced filters to find specific subdomains
4. **Export**: Download results in various formats
5. **Generate Reports**: Create professional PDF reports
6. **Compare Scans**: Track changes over time

---

## Deployment

### Docker Deployment (Recommended)

This project includes a Dockerfile and Nginx configuration for production-grade deployment.

1. **Build the Image**
   ```bash
   docker build -t cybereye .
   ```

2. **Run the Container**
   ```bash
   docker run -p 8080:80 cybereye
   ```
   Access the application at `http://localhost:8080`.

### Static Hosting

Build the project for production:

```bash
npm run build
```

The optimized build will be in the `dist/` directory, ready to deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: Deploy the `dist` folder
- **GitHub Pages**: Push `dist` to `gh-pages` branch

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration:
- **Build Verification**: Automatically builds the Docker image on push.
- **Tests**: Runs unit and E2E accuracy tests.
- **Security**: Performs code scanning via OpenSSF Scorecard.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**CyberEye v2.0.0** - © 2026 Advanced Attack Surface Intelligence
