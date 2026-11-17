# تجهيز IM Vault كتطبيق Android APK

هذا الإصدار يضيف غلاف Capacitor وإعداد بناء APK إلى مشروع React/Vite الأصلي. لم يتم إنشاء APK داخل هذه البيئة لعدم توفر Android SDK/Gradle هنا.

## المتطلبات
- Node.js 22 أو أحدث
- Android Studio + Android SDK (للبناء محلياً)

## البناء على جهاز كمبيوتر
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
ملف APK الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

## بناء APK سحابياً من الهاتف
1. ارفع محتويات هذا المشروع إلى مستودع GitHub جديد.
2. افتح تبويب Actions في المستودع.
3. اختر `Build IM Vault APK` ثم `Run workflow`.
4. بعد انتهاء البناء، افتح تشغيل المهمة ونزّل Artifact باسم `IM-Vault-debug-APK`.
5. فك ضغط الـ Artifact وثبّت `app-debug.apk` على هاتف Android.

## العمل دون إنترنت
- واجهة التطبيق والاعتمادات تُضمّن داخل APK بعد البناء.
- أزلنا تحميل خطوط Google من الإنترنت.
- وظائف التشفير في الكود تعمل محلياً ولا يظهر استخدام fetch أو طلبات API داخل مجلد src.
- أول تثبيت وتنزيل APK يحتاجان إنترنت.

## ملاحظة أمنية مهمة
ملف المصدر الأصلي يتضمن قيمة ثابتة باسم `IM_PROTOCOL_KEY_SEED` في `src/crypto/imFormat.ts`، ووصفه بأنه وضع بلا كلمة مرور. تحويله إلى APK لا يعالج هذا التصميم؛ لا تستخدمه لحماية أسرار حساسة قبل مراجعة نموذج إدارة المفاتيح.
