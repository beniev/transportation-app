# מדריך התקנה והפעלה - אפליקציית מובילים

## סקירה כללית

אפליקציית SaaS למובילים עם יכולות AI לניתוח הזמנות ותמחור אוטומטי.

- **Backend:** Django REST Framework (Python)
- **Frontend:** React + TypeScript + Vite
- **Database:** PostgreSQL
- **AI:** Google Gemini 2.5 Pro

---

## חלק א': התקנת תוכנות נדרשות

### 1. Python 3.11+
1. הורד מ: https://www.python.org/downloads/
2. בהתקנה, סמן ✅ **"Add Python to PATH"**
3. לחץ "Install Now"

לבדיקה, פתח PowerShell והרץ:
```powershell
python --version
```

### 2. Node.js 18+
1. הורד מ: https://nodejs.org/ (גרסת LTS)
2. התקן עם הגדרות ברירת מחדל

לבדיקה:
```powershell
node --version
npm --version
```

### 3. PostgreSQL 15+
1. הורד מ: https://www.postgresql.org/downloads/windows/
2. בהתקנה:
   - זכור את הסיסמה שאתה בוחר! (למשל: `postgres123`)
   - השאר פורט ברירת מחדל: `5432`
3. סיים התקנה

### 4. Git (אופציונלי)
הורד מ: https://git-scm.com/download/win

---

## חלק ב': הגדרת בסיס הנתונים

### אפשרות 1: דרך pgAdmin (ממשק גרפי)
1. פתח **pgAdmin 4** (הותקן עם PostgreSQL)
2. התחבר לשרת (הכנס את הסיסמה שבחרת)
3. קליק ימני על "Databases" → "Create" → "Database"
4. בשם הכנס: `movers_db`
5. לחץ "Save"

### אפשרות 2: דרך Command Line
1. פתח **SQL Shell (psql)** מתפריט התחל
2. לחץ Enter לכל השאלות (ברירות מחדל), הכנס סיסמה
3. הרץ:
```sql
CREATE DATABASE movers_db;
```
4. לחץ Enter, תראה `CREATE DATABASE`
5. הקלד `\q` ליציאה

---

## חלק ג': הגדרת Backend (Django)

### שלב 1: פתח PowerShell
לחץ `Win + X` → "Windows PowerShell" או "Terminal"

### שלב 2: נווט לתיקיית Backend
```powershell
cd C:\transportation_app\backend
```

### שלב 3: צור סביבה וירטואלית
```powershell
python -m venv venv
```

### שלב 4: הפעל את הסביבה הוירטואלית
```powershell
.\venv\Scripts\Activate
```
תראה `(venv)` בתחילת השורה - זה אומר שזה עובד!

### שלב 5: התקן חבילות Python
```powershell
pip install -r requirements.txt
```
זה ייקח כמה דקות...

### שלב 6: צור קובץ הגדרות
```powershell
copy .env.example .env
```

### שלב 7: ערוך את קובץ ההגדרות
פתח את הקובץ `C:\transportation_app\backend\.env` בעורך טקסט (Notepad או VS Code)

שנה את השורה:
```
DB_PASSWORD=your_postgres_password
```
ל:
```
DB_PASSWORD=הסיסמה_שבחרת_בהתקנת_PostgreSQL
```

שמור וסגור.

### שלב 8: צור את טבלאות הדאטאבייס
```powershell
python manage.py migrate
```

### שלב 9: צור משתמש מנהל
```powershell
python manage.py createsuperuser
```
הכנס:
- אימייל: `admin@example.com` (או כל אימייל)
- סיסמה: בחר סיסמה (לפחות 8 תווים)

### שלב 10: הרץ את השרת
```powershell
python manage.py runserver
```

תראה:
```
Starting development server at http://127.0.0.1:8000/
```

✅ **Backend רץ!** השאר את החלון פתוח.

---

## חלק ד': הגדרת Frontend (React)

### שלב 1: פתח PowerShell חדש
חשוב! לא לסגור את הקודם. פתח חלון חדש.

### שלב 2: נווט לתיקיית Frontend
```powershell
cd C:\transportation_app\frontend
```

### שלב 3: התקן חבילות Node
```powershell
npm install
```
זה ייקח כמה דקות...

### שלב 4: צור קובץ הגדרות
```powershell
copy .env.example .env
```

### שלב 5: הרץ את השרת
```powershell
npm run dev
```

תראה:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

✅ **Frontend רץ!**

---

## חלק ה': גישה לאפליקציה

פתח דפדפן ונווט ל:

| כתובת | תיאור |
|--------|--------|
| http://localhost:5173 | האפליקציה הראשית |
| http://localhost:8000/admin | פאנל ניהול Django |

### התחברות לפאנל ניהול
1. לך ל: http://localhost:8000/admin
2. הכנס את האימייל והסיסמה שיצרת בשלב 9

---

## חלק ו': סקריפט הפעלה מהירה (אופציונלי)

כדי להפעיל הכל בלחיצה אחת, צור קובץ:

### יצירת הקובץ
1. פתח Notepad
2. העתק את הטקסט הבא:

```batch
@echo off
title Movers App Launcher
color 0A

echo ========================================
echo    Movers App - Starting Services
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Django Backend" cmd /k "cd /d C:\transportation_app\backend && .\venv\Scripts\activate && python manage.py runserver"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Server...
start "React Frontend" cmd /k "cd /d C:\transportation_app\frontend && npm run dev"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:5173
echo    Admin:    http://localhost:8000/admin
echo.
echo ========================================
echo.
echo Press any key to open the app in browser...
pause > nul

start http://localhost:5173
```

3. שמור כ: `C:\transportation_app\start.bat`
   - ב-"Save as type" בחר "All Files"
   - ודא שהשם מסתיים ב-`.bat` ולא `.bat.txt`

### שימוש
פשוט לחץ פעמיים על `start.bat` - הכל יעלה אוטומטית!

---

## חלק ז': פתרון בעיות נפוצות

### בעיה: `python` לא מזוהה
**פתרון:** Python לא נוסף ל-PATH
```powershell
# נסה להשתמש ב-py במקום python:
py -m venv venv
py manage.py runserver
```
או התקן מחדש Python וסמן "Add to PATH"

### בעיה: `npm` לא מזוהה
**פתרון:** סגור את PowerShell, פתח מחדש ונסה שוב

### בעיה: שגיאת חיבור לדאטאבייס
```
connection refused / could not connect
```
**פתרון:**
1. ודא ש-PostgreSQL רץ (בדוק ב-Services)
2. ודא שהסיסמה ב-`.env` נכונה
3. ודא ששם הדאטאבייס `movers_db` נוצר

### בעיה: Port 8000 תפוס
```powershell
# מצא מה תופס את הפורט:
netstat -ano | findstr :8000

# הרג את התהליך (החלף XXXX במספר ה-PID):
taskkill /PID XXXX /F

# או הרץ על פורט אחר:
python manage.py runserver 8001
```

### בעיה: שגיאת CORS
**פתרון:** ודא שב-Backend `.env` יש:
```
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### בעיה: WeasyPrint/PDF לא עובד
**פתרון:** התקן GTK3 Runtime:
1. הורד מ: https://github.com/nicothin/weasyprint_dependencies_win/releases
2. הרץ את ההתקנה
3. הפעל מחדש את PowerShell

---

## חלק ח': עצירת השרתים

### לעצור את Backend
בחלון ה-PowerShell של Django: לחץ `Ctrl + C`

### לעצור את Frontend
בחלון ה-PowerShell של React: לחץ `Ctrl + C` (פעמיים)

---

## חלק ט': הפעלה בפעם הבאה

אחרי שהכל מותקן, בפעם הבאה רק צריך:

### Backend:
```powershell
cd C:\transportation_app\backend
.\venv\Scripts\Activate
python manage.py runserver
```

### Frontend (בחלון נפרד):
```powershell
cd C:\transportation_app\frontend
npm run dev
```

או פשוט להשתמש ב-`start.bat` שיצרת!

---

## נספח: API Keys (אופציונלי)

לפיצ'רים מתקדמים תצטרך מפתחות API:

| שירות | שימוש | קישור |
|--------|--------|--------|
| Google Gemini | AI לפירסור טקסט | https://ai.google.dev/ |
| Google Maps | השלמת כתובות | https://console.cloud.google.com |
| Twilio | שליחת SMS | https://www.twilio.com |

הוסף אותם לקובץ `.env` של ה-Backend.

---

## צריך עזרה?

אם משהו לא עובד:
1. קרא את הודעת השגיאה בזהירות
2. חפש את השגיאה ב-Google
3. ודא שכל השלבים בוצעו בסדר

בהצלחה! 🚀
