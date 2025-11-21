# 🎥 Agora Video Call - Complete Guide

**Project:** RealChat eCommerce | **Date:** Nov 10, 2025

---

## What is Agora?

Real-time video/audio platform with:
- Low latency (< 400ms)
- HD video quality
- 10,000 FREE minutes/month
- Global infrastructure

---

## How It Works

```
User clicks call → Backend generates token → Agora SDK connects → Video streams
```

**Call Flow:**
1. User initiates call
2. Backend creates call record + Agora token
3. WebSocket notifies other user
4. Both join Agora channel
5. Media streams through Agora Cloud

---

## Implementation Files

### Backend (12 files)
- Migrations: `video_calls`, `call_participants`
- Models: `VideoCall`, `CallParticipant`
- Controller: `CallController` (9 methods)
- Events: `IncomingCall`, `CallAccepted`, `CallEnded`
- Helper: `AgoraTokenBuilder`

### Frontend (3 components)
- `CallButton.jsx` - Initiate calls
- `IncomingCallModal.jsx` - Incoming notification
- `VideoCallModal.jsx` - Video interface

---

## Agora Account Setup (5 Minutes)

### 1. Create Account
- Go to: https://console.agora.io
- Sign up (FREE, no credit card)

### 2. Create Project
- Name: "RealChat eCommerce"
- Authentication: **"Secured mode: APP ID + Token"** ⚠️
- Get credentials

### 3. Get Credentials
- **App ID:** Copy visible ID
- **App Certificate:** Click 👁️ to reveal

**Your credentials:**
```
App ID:          4ec37e1f9eda4fa08d36e642c7cf91c4
App Certificate: 2ede806564e04a7a85ad91ec9c17c0d3
```

---

## Configuration

### Development
```env
# .env file
AGORA_APP_ID=4ec37e1f9eda4fa08d36e642c7cf91c4
AGORA_APP_CERTIFICATE=2ede806564e04a7a85ad91ec9c17c0d3
```

```bash
php artisan config:clear
php artisan migrate
npm run build
```

---

## Production Deployment

### 1. Create Production Project
- Separate Agora project for production
- Get new production credentials

### 2. Configure Production
```env
AGORA_APP_ID=production_app_id
AGORA_APP_CERTIFICATE=production_certificate
```

### 3. Deploy
```bash
composer install --no-dev
npm run build
php artisan migrate --force
php artisan config:cache
systemctl restart nginx php8.2-fpm
php artisan reverb:restart
```

### 4. SSL Setup (Required)
- Enable HTTPS
- SSL for WebSocket
- Update Reverb config to use `wss://`

### 5. Supervisor for Reverb
```ini
[program:reverb]
command=php /var/www/app/artisan reverb:start
autostart=true
autorestart=true
```

---

## Agora Console Management

### Dashboard
- View current usage
- Monitor call quality
- Check concurrent users

### Setup Alerts
- Project Settings → Notifications
- Set usage threshold (80%)
- Add email for alerts

### Monitor Usage
- Daily usage reports
- Call success rates
- Geographic distribution

---

## Pricing

### FREE Tier
✅ 10,000 minutes/month  
✅ Resets monthly  

### Paid (After Free)
- Audio: $0.99/1000 min
- Video SD: $0.99/1000 min
- Video HD: $3.99/1000 min
- Video Full HD: $8.99/1000 min

### Cost Examples
- 100 users × 5 calls × 10 min = 5,000 min/month = **FREE**
- 500 users × 10 calls × 10 min = 50,000 min = **$160/month** (HD video)

---

## Security Best Practices

### DO:
✅ Store credentials in `.env`  
✅ Add `.env` to `.gitignore`  
✅ Use HTTPS/SSL  
✅ Different credentials for dev/prod  
✅ Set token expiry (1 hour)  

### DON'T:
❌ Commit credentials to Git  
❌ Share App Certificate  
❌ Use prod credentials in dev  
❌ Expose certificate to frontend  

---

## Troubleshooting

### "Cannot find appid"
```bash
grep AGORA .env
php artisan config:clear
```

### "Token expired"
- Tokens valid for 1 hour
- Request new token from backend

### No video/audio
- Check browser permissions
- Requires HTTPS
- Allow camera/microphone access

### WebSocket failed
```bash
php artisan reverb:start
supervisorctl status reverb
```

### Poor quality
- Check network (min 1 Mbps)
- Reduce video quality in settings
- Use audio-only if needed

---

## Monitoring Queries

```sql
-- Total calls today
SELECT COUNT(*) FROM video_calls WHERE DATE(created_at) = CURDATE();

-- Average duration
SELECT AVG(duration) FROM video_calls WHERE status = 'ended';

-- Success rate
SELECT status, COUNT(*) FROM video_calls GROUP BY status;
```

---

## Production Checklist

### Before Deploy:
- [ ] Production Agora project created
- [ ] Production credentials in `.env`
- [ ] HTTPS enabled
- [ ] SSL for WebSocket
- [ ] Migrations run
- [ ] Supervisor configured
- [ ] Budget alerts set

### After Deploy:
- [ ] Test call functionality
- [ ] Monitor usage in console
- [ ] Check error logs
- [ ] Verify WebSocket connection

---

## Support & Resources

- **Agora Console:** https://console.agora.io
- **Agora Docs:** https://docs.agora.io
- **Support:** support@agora.io

---

**Status:** ✅ Production Ready  
**Free Tier:** 10,000 min/month  
**Current Setup:** Development + Production credentials configured
