# نظام إدارة معهد ريادة الغد — MVP
## Phase 01 (Foundation) + Phase 02 (Master Data)

---

## 🚀 تشغيل سريع

### المتطلبات
- Node.js 20+
- PostgreSQL 15+
- npm أو pnpm

### 1. إعداد قاعدة البيانات

```bash
createdb riyadat_db
psql riyadat_db < backend/src/db/schema.sql
psql riyadat_db < backend/src/db/seed.sql
```

### 2. تشغيل الـ Backend

```bash
cd backend
cp .env.example .env
# عدّل DATABASE_URL و JWT_SECRET في .env
npm install
npm run dev
# يشتغل على http://localhost:4000
```

### 3. تشغيل الـ Frontend

```bash
cd frontend
npm install
npm run dev
# يشتغل على http://localhost:5173
```

---

## 🔑 حسابات تجريبية (من seed.sql)

| Role | Username | Password |
|---|---|---|
| Super Admin | superadmin | admin123 |
| Manager | manager1 | admin123 |
| Staff | staff1 | admin123 |
| Trainer | trainer1 | admin123 |

---

## 📂 البنية

```
riyadat-mvp/
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── config/               # DB + env config
│   │   ├── middleware/           # auth, RBAC, tenant, audit
│   │   ├── routes/               # API routes
│   │   ├── controllers/          # Business logic
│   │   ├── db/schema.sql         # Full DB schema
│   │   └── db/seed.sql           # Sample data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/                # Screens
│   │   ├── components/           # Reusable UI
│   │   ├── lib/api.js            # axios instance
│   │   └── stores/auth.js        # zustand auth store
│   └── package.json
└── README.md
```

---

## ✅ الميزات المُنفذة

### Phase 01 — الأساس
- [x] JWT Authentication (access + refresh tokens)
- [x] 5 roles: Super Admin / Manager / Staff / Trainer / Trainee
- [x] bcrypt password hashing (cost 12)
- [x] RBAC middleware
- [x] Tenant isolation middleware
- [x] Audit logs
- [x] Rate limiting
- [x] Helmet + CORS + security headers
- [x] Zod validation

### Phase 02 — Master Data
- [x] Companies CRUD (contract dates + early termination)
- [x] Departments CRUD (with cascade)
- [x] Training Programs CRUD
- [x] Groups CRUD
- [x] Rooms CRUD
- [x] Employees CRUD
- [x] Trainer-group assignments
- [x] **تجديد جماعي للشركات** (Bulk Renewal)
- [x] **Dropdowns قابلة للبحث** (بدل كتابة UUID)

### الواجهة (Frontend)
- [x] **Sidebar جانبية بأيقونات SVG** (Heroicons) — بدلاً من الشريط العلوي
- [x] طي / فرد الـ Sidebar (collapse)
- [x] صفحة تغيير كلمة المرور
- [x] صفحة سجل النشاط (Audit Logs) — super_admin فقط
- [x] صفحة التجديد الجماعي للشركات
- [x] توسيع `ProtectedRoute` لدعم تقييد الأدوار

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `POST /api/auth/change-password`  — تغيير كلمة المرور للمستخدم الحالي

### Companies
- `GET    /api/companies`
- `POST   /api/companies`
- `GET    /api/companies/:id`
- `PUT    /api/companies/:id`
- `DELETE /api/companies/:id`
- `POST   /api/companies/:id/terminate`
- `POST   /api/companies/bulk-renew`  — **جديد**: تجديد جماعي `{ company_ids: […], months: N }`

### Departments / Programs / Groups / Rooms / Employees
نفس نمط الـ CRUD الأساسي (List / Get / Create / Update / Delete)
— وترجع قوائم العرض أسماء الشركة / القسم / البرنامج محلولة (JOIN-ed) بدل الـ UUID‌ات.

### Lookups (لـ Dropdowns القابلة للبحث) — **جديد**
- `GET /api/lookups/companies?q=...`
- `GET /api/lookups/departments?q=...&company_id=...`
- `GET /api/lookups/programs?q=...&department_id=...`
- `GET /api/lookups/rooms?q=...`
- `GET /api/lookups/employees?q=...&role=trainer`

كل واحد يرجع `{ data: [{ id, label, … }] }` بحد أقصى 100 صف ومع بحث فوري.

### Audit Logs
- `GET /api/audit-logs?action=...&entity_type=...` (super_admin فقط)

---

## 🔜 المراحل القادمة (غير مُنفذة في الـ MVP)
- Phase 03: التسجيل والقبول
- Phase 04: دورة حياة المتدرب
- Phase 05: الحضور
- Phase 06–10: الإجازات، المخالفات، الإشعارات، البوابات، الإطلاق

---

## 🆕 التغييرات في الإصدار v3

### إضافات بيانات الشركة
- **رفع شعار الشركة** (PNG/JPG/WEBP/SVG, حتى 2MB) — `POST /api/companies/:id/logo`
- حقول **مدير الشركة**: `manager_name`, `manager_phone`, `manager_email`
- حقول **مسؤول HR**: `hr_name`, `hr_phone`, `hr_email`
- الحقول الجديدة معروضة في جدول الشركات + نموذج الإنشاء/التعديل (مقسّم لعدة sections)

### إصلاحات
- ✅ **`/api/auth/change-password` 404** — كان في نسخة قديمة. الـ controller والـ route مفعلان الآن.
- ✅ **`/api/companies/bulk-renew` 404** — تم ترتيب الـ route قبل `/:id` لتجنب التطابق. كما أصبح يقبل `extend_months` أو `months`.
- ✅ **`/api/lookups/companies?id=...` 404** — تمت إضافة دعم `?id=` في جميع lookup endpoints لجلب صف واحد.
- ✅ **UUID invalid** — الآن يتم فحص الـ UUID في الـ backend والـ frontend قبل إرسال الطلب.
- ✅ **SearchableSelect يستدعي `?q=` قبل تسجيل الدخول** — الآن يتحقق من وجود access_token أولاً.

### مهم: إذا تشغل نسخة قاعدة بيانات سابقة
شغّل ملف الـ migration **مرة واحدة** لإضافة الحقول الجديدة:
```bash
psql $DATABASE_URL -f backend/src/db/migration_v2.sql
```

أو إذا في بيئة اختبار وتقدر تعيد بناء القاعدة:
```bash
psql $DATABASE_URL -f backend/src/db/schema.sql && psql $DATABASE_URL -f backend/src/db/seed.sql
```

بعد التحديث أعد تشغيل الـ backend: `npm run dev` في مجلد backend.

---

## 🆕 التغييرات في الإصدار v2

- **Sidebar بأيقونات SVG** (Heroicons outline) مكان الشريط العلوي، مع تكيف مع شاشات الموبايل، وزر طي/فرد
- **`SearchableSelect` component** يستبدل كل حقول UUID:
  - الأقسام → اختر الشركة بالاسم
  - البرامج → اختر القسم بالاسم
  - المجموعات → اختر البرنامج / المدرب / القاعة
  - القاعات والموظفين → اختر الشركة
- **5 Lookup endpoints** جديدة مع بحث `?q=` وحماية tenant.
- **Change Password** واجهة + endpoint باليدات (8 حرف + حرف كبير + رقم).
- **Audit Logs** واجهة مع فلاتر (الإجراء والكيان).
- **Bulk Renewal**: واجهة تحديد متعدد + endpoint transactional لتجديد عقود N من الشركات لـ M شهر.
- **قوائم العرض** أصبحت تعرض أسماء الكيانات المرتبطة (الشركة، القسم، البرنامج) بدل الـ UUID الخام.
