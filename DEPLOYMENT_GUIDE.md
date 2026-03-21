# 🚀 Free Deployment Guide for Wedding Management App

## ✅ Prerequisites Prepared
- Backend configured for Railway
- Procfile created
- Requirements.txt ready
- Code ready for deployment

---

## 📋 Deployment Steps

### **STEP 1: MongoDB Atlas (Database) - 5 minutes**

1. **Go to:** https://www.mongodb.com/cloud/atlas/register
2. **Sign up** (free, no credit card)
3. **Create Database:**
   - Click "Build a Database"
   - Choose "M0 Sandbox" (FREE forever)
   - Cloud Provider: AWS
   - Region: Choose closest to you (Mumbai for India)
   - Cluster Name: wedding-db
   - Click "Create"

4. **Create Database User:**
   - Security → Database Access → Add New Database User
   - Username: `weddinguser`
   - Password: **Create strong password** (SAVE THIS!)
   - Database User Privileges: Read and write to any database
   - Click "Add User"

5. **Allow Network Access:**
   - Security → Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

6. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Python, Version: 3.11 or later
   - Copy the connection string
   - It looks like: `mongodb+srv://weddinguser:<password>@wedding-db.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - **IMPORTANT:** Replace `<password>` with your actual password
   - **SAVE THIS STRING** - you'll need it for Railway

---

### **STEP 2: Railway (Backend API) - 10 minutes**

1. **Go to:** https://railway.app
2. **Sign up** with GitHub (free)
3. **Create New Project:**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - **If this is your first time:**
     - You'll need to push your code to GitHub first
     - See "Push to GitHub" section below

4. **Configure Backend:**
   - Select your repository
   - Railway will detect Python
   - Root Directory: `/backend` (if prompted)

5. **Add Environment Variables:**
   - Click on your service → Variables
   - Add these variables:
   ```
   MONGO_URL=<Your MongoDB Atlas connection string from Step 1>
   DB_NAME=wedding_db
   PORT=8000
   ```

6. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Click "Settings" → "Generate Domain"
   - **SAVE THIS URL** - Example: `https://your-app-production.up.railway.app`

7. **Test Backend:**
   - Visit: `https://your-app-production.up.railway.app/api/budgets`
   - Should see: `{"total_budgeted":0.0,"total_spent":0.0,"remaining":0.0,"items":[]}`
   - ✅ Backend is working!

---

### **STEP 3: Vercel (Frontend) - 5 minutes**

1. **Go to:** https://vercel.com
2. **Sign up** with GitHub (free)
3. **Import Project:**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Root Directory: `frontend`

4. **Configure Build:**
   - Framework Preset: Other
   - Build Command: `yarn build` (or leave default)
   - Output Directory: `dist` (or leave default)

5. **Add Environment Variable:**
   - Environment Variables → Add
   ```
   Name: EXPO_PUBLIC_BACKEND_URL
   Value: <Your Railway URL from Step 2>
   ```
   Example: `https://your-app-production.up.railway.app`

6. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - **SAVE YOUR URL** - Example: `https://wedding-app.vercel.app`

7. **Test Frontend:**
   - Visit your Vercel URL
   - Should see your wedding app!
   - ✅ Frontend is working!

---

## 📤 Push to GitHub (If not done already)

If you need to push your code to GitHub first:

```bash
# Initialize git (if not done)
cd /app
git init

# Add all files
git add .

# Commit
git commit -m "Wedding management app"

# Create GitHub repository
# 1. Go to github.com
# 2. Click "+" → "New repository"
# 3. Name: "wedding-management-app"
# 4. Public or Private (your choice)
# 5. Don't initialize with README
# 6. Click "Create repository"

# Push to GitHub
git remote add origin https://github.com/YOUR-USERNAME/wedding-management-app.git
git branch -M main
git push -u origin main
```

---

## ✅ Final Checklist

After deployment, verify:

- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Connection string saved
- [ ] Railway backend deployed
- [ ] Backend URL working: `/api/budgets` returns JSON
- [ ] Vercel frontend deployed
- [ ] Frontend URL opens the app
- [ ] Can add family members
- [ ] Can add budget items
- [ ] Can add tasks
- [ ] Real-time updates work (3-5 seconds)

---

## 📱 Share with Family

Share your Vercel URL with family:
```
https://your-wedding-app.vercel.app
```

They can:
- Open on any browser
- Use on Android/iPhone
- Install as PWA (Add to Home Screen)
- Get real-time updates
- Collaborate on wedding planning!

---

## 🔧 Troubleshooting

**Backend not working:**
- Check MONGO_URL in Railway variables
- Check DB_NAME is set to `wedding_db`
- Check backend logs in Railway dashboard

**Frontend not loading:**
- Check EXPO_PUBLIC_BACKEND_URL in Vercel
- Make sure it points to Railway URL
- Check browser console for errors

**Real-time not working:**
- Check if backend is accessible from frontend
- Check network tab in browser
- May take 3-5 seconds to sync

---

## 💰 Cost Breakdown

- MongoDB Atlas: $0 (512MB free)
- Railway: $0 ($5/month free tier, you'll use ~$2-3)
- Vercel: $0 (unlimited free tier)

**Total: $0 per month!**

---

## 📞 Need Help?

If you get stuck:
1. Check service status dashboards
2. Review environment variables
3. Check deployment logs
4. Ask me for help!

---

## 🎉 Congratulations!

Once deployed, your wedding management app will be:
- ✅ Live 24/7
- ✅ Accessible to all family
- ✅ Working on Android & iPhone
- ✅ Real-time synced
- ✅ Completely FREE!

Happy wedding planning! 💒👰🤵
