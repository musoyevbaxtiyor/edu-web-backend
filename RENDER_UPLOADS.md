# Render'da yuklangan fayllar (uploads) 404 bo‘lmasligi uchun

Render’da server har deploy/restart da yangilanadi, shuning uchun `uploads/` papkadagi fayllar saqlanmaydi. Yuklangan fayllar (submissions) doimiy saqlanishi uchun **Persistent Disk** ulab, backend’ga path ni aytishingiz kerak.

## Qadamlar

### 1. Render’da Persistent Disk qo‘shish

1. [Render Dashboard](https://dashboard.render.com) → loyihangiz (edu-web-backend) → **Environment**.
2. **Persistent Disks** bo‘limiga o‘ting.
3. **Add Disk**:
   - **Name:** `uploads` (yoki ixtiyoriy)
   - **Mount Path:** `/opt/render/project/data` (yoki Render’ning ko‘rsatgan path)
   - **Size:** kerak bo‘lcha (masalan 1 GB)
4. Saqlang va servisni **Redeploy** qiling.

### 2. Environment variable qo‘yish

1. **Environment** → **Environment Variables**.
2. Yangi o‘zgaruvchi:
   - **Key:** `UPLOAD_DIR`
   - **Value:** `/opt/render/project/data/uploads`  
     (agar Mount Path boshqacha bo‘lsa, shu path + `/uploads`, masalan: `{Mount Path}/uploads`)
3. Saqlang va **Redeploy** qiling.

### 3. Tekshirish

- Yangi submission yuklang.
- `/uploads/submissions/...` linkini oching — fayl ochilishi kerak.
- Keyingi deploy’lardan keyin ham fayl qoladi (disk persistent).

---

**Eslatma:** Agar Persistent Disk qo‘shmasangiz, yuklangan fayllar har deploy/restart dan keyin yo‘qoladi va link 404 qaytaradi.
