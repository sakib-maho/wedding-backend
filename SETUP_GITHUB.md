# Setup GitHub Repository

## Initialize Git Repository

```bash
cd /Users/sakib/Weeding/wedding-backend

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Wedding invitation backend API"

# Create main branch
git branch -M main

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/wedding-backend.git

# Push to GitHub
git push -u origin main
```

## Or create repository on GitHub first

1. Go to https://github.com/new
2. Repository name: `wedding-backend`
3. Description: "Backend API for wedding invitation website"
4. Set to Public or Private
5. Don't initialize with README (we already have one)
6. Click "Create repository"
7. Then run:

```bash
cd /Users/sakib/Weeding/wedding-backend
git init
git add .
git commit -m "Initial commit: Wedding invitation backend API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wedding-backend.git
git push -u origin main
```

## Project Structure

```
/Users/sakib/Weeding/
├── undangan/              # Frontend (separate repo)
│   ├── index.html
│   ├── dashboard.html
│   ├── js/
│   └── ...
└── wedding-backend/       # Backend (separate repo) ✅
    ├── index.js
    ├── db.js
    ├── routes/
    ├── middleware/
    └── ...
```

Both projects are now completely separate and can be deployed independently!

