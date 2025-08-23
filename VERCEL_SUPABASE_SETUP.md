# CustomerSignal: Vercel + Supabase Deployment Guide

Since you already have Supabase and Vercel accounts, this guide will get you deployed quickly.

## 🚀 Quick Deployment Steps

### 1. Supabase Project Setup

```bash
# Create new Supabase project
supabase projects create customer-signal --org-id your-org-id

# Link to your project
supabase link --project-ref your-project-ref

# Push database schema
supabase db push

# Deploy edge functions
supabase functions deploy
```

### 2. Get Your Supabase Keys

Go to your Supabase project dashboard → Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up environment variables
```

### 4. Configure Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

#### **Essential Variables (Required)**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Sentiment Analysis (Choose One)**
```
# Option A: OpenAI (Recommended - $10-20/month)
OPENAI_API_KEY=sk-proj-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# Option B: Azure Cognitive Services ($2 per 1K transactions)
AZURE_COGNITIVE_SERVICES_KEY=your-azure-key
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://your-region.cognitiveservices.azure.com/
```

#### **Email Service (Choose One)**
```
# Option A: SendGrid (Recommended - $15/month)
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Option B: Resend ($20/month)
RESEND_API_KEY=re_your-resend-key
```

#### **Social Media APIs (Add as needed)**
```
# Twitter/X (Essential for social monitoring - $100/month)
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# Reddit (Free)
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
```

### 5. Add Redis (Upstash)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create new Redis database
3. Copy the connection URL
4. Add to Vercel environment variables:

```
REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6380
```

### 6. Configure Domain (Optional)

In Vercel dashboard → Settings → Domains:
- Add your custom domain
- Configure DNS records as shown

## 🔑 API Keys You'll Need

### **Phase 1: MVP Launch (Essential)**

1. **Supabase** (Already have account ✅)
   - Cost: $25/month (Pro plan)
   - Get keys from project dashboard

2. **OpenAI** (Recommended for sentiment analysis)
   - Cost: ~$10-20/month
   - Sign up: [platform.openai.com](https://platform.openai.com)
   - Add billing method and create API key

3. **SendGrid** (Email notifications)
   - Cost: $15/month (Essentials)
   - Sign up: [sendgrid.com](https://sendgrid.com)
   - Verify your domain for better deliverability

4. **Upstash Redis** (Caching)
   - Cost: $10/month
   - Sign up: [upstash.com](https://upstash.com)

**Total Phase 1 Cost: ~$60/month**

### **Phase 2: Social Monitoring (Add Later)**

5. **Twitter/X API**
   - Cost: $100/month (Basic tier)
   - Apply: [developer.twitter.com](https://developer.twitter.com)
   - ⚠️ **Note**: Application approval can take 1-2 weeks

6. **Reddit API**
   - Cost: Free
   - Setup: [reddit.com/prefs/apps](https://reddit.com/prefs/apps)

**Total Phase 2 Cost: ~$160/month**

### **Phase 3: Enhanced Features (Optional)**

7. **Sentry** (Error tracking)
   - Cost: $26/month
   - Sign up: [sentry.io](https://sentry.io)

8. **Brand24** (Advanced social listening)
   - Cost: $79/month
   - Sign up: [brand24.com](https://brand24.com)

## 🛠️ Local Development Setup

```bash
# 1. Clone and install
git clone <your-repo>
cd customer-signal
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Start Supabase locally
supabase start

# 4. Start development server
npm run dev
```

## 🧪 Testing Your Setup

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:accessibility  # Should pass ✅
npm run test:api           # Should pass ✅
npm run test:e2e           # Should pass ✅

# Run comprehensive test suite
node scripts/run-comprehensive-tests.js
```

## 🚨 Common Issues & Solutions

### **Supabase Connection Issues**
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### **Vercel Deployment Issues**
```bash
# Check build logs
vercel logs

# Redeploy
vercel --prod
```

### **Environment Variable Issues**
- Ensure all required variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Restart deployment after adding variables

## 📊 Monitoring Your Deployment

### **Vercel Analytics**
- Built-in analytics available in Vercel dashboard
- Shows page views, performance metrics, errors

### **Supabase Dashboard**
- Database usage and performance
- API request metrics
- Real-time connections

### **Add Sentry (Recommended)**
```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  silent: true,
  org: "your-org",
  project: "customer-signal",
});
```

## 🔄 CI/CD Pipeline

Your GitHub Actions workflow is already configured! Just:

1. **Add secrets to GitHub repository**:
   - `VERCEL_TOKEN` (from Vercel account settings)
   - `VERCEL_ORG_ID` (from Vercel dashboard)
   - `VERCEL_PROJECT_ID` (from Vercel project settings)
   - `SUPABASE_ACCESS_TOKEN` (from Supabase account)

2. **Push to main branch** - automatic deployment!

## 💰 Cost Breakdown (Vercel + Supabase)

### **MVP (Phase 1)**
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- OpenAI: ~$15/month
- SendGrid: $15/month
- Upstash Redis: $10/month
- **Total: $85/month**

### **Production Ready (Phase 2)**
- Add Twitter API: +$100/month
- Add Sentry: +$26/month
- **Total: $211/month**

### **Enterprise (Phase 3)**
- Add Brand24: +$79/month
- Upgrade plans as needed
- **Total: ~$290/month**

## 🎯 Next Steps

### **Immediate (Today)**
1. ✅ Create Supabase project
2. ✅ Deploy to Vercel
3. ✅ Add essential environment variables
4. ✅ Test basic functionality

### **This Week**
1. 🔑 Get OpenAI API key
2. 📧 Setup SendGrid
3. 🗄️ Add Upstash Redis
4. 🧪 Run full test suite

### **Next Week**
1. 🐦 Apply for Twitter API access (takes 1-2 weeks)
2. 📊 Add Sentry for monitoring
3. 🔒 Configure custom domain with SSL
4. 📈 Set up analytics tracking

### **Month 1**
1. 🚀 Launch MVP with core features
2. 📱 Add Reddit API integration
3. 🔍 Optimize performance based on usage
4. 👥 Onboard first users

## 🆘 Getting Help

### **Quick Commands**
```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Check Supabase status
supabase status

# Test API endpoints
curl https://your-app.vercel.app/api/health
```

### **Support Resources**
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- CustomerSignal Docs: Check the documentation files in this repo

---

**🎉 You're ready to deploy!** With your existing Supabase and Vercel accounts, you can have CustomerSignal running in production within an hour. Start with the essential APIs and add more features as you grow.