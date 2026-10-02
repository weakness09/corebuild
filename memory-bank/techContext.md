# Tech Context - CodeRebuild

## 1. Teknoloji Yığını

| Katman | Teknoloji / Kütüphane | Versiyon / Standart | Açıklama |
|---|---|---|---|
| **Dil** | TypeScript | ^5.6 (strict mode) | Tip güvenliği, tip daraltma ve ayrıştırma doğruluğu |
| **Geliştirme / Build** | Vite | ^6.x | Hızlı HMR ve optimize üretim paketi |
| **Arayüz Çatısı** | React | ^18.x | Deklaratif UI bileşenleri |
| **Grafik Görselleştirme** | @xyflow/react (React Flow) | ^12.x | İnteraktif düğüm ve kenar tuvali |
| **Otomatik Yerleşim** | @dagrejs/dagre | ^1.x | Yönlü grafikler için tek tip hiyerarşik layout paketi |
| **Durum Yönetimi** | Zustand | ^5.x | Hafif, performanslı ve boilerplate-free state |
| **Stil / Arayüz** | Tailwind CSS / Lucide React | Modern CSS | Hızlı, temiz ve koyu/açık tema uyumlu tasarım |
| **Birim Test** | Vitest | ^3.x | Hızlı, Vite ile entegre birim ve kapsama testi |
| **Grafik Dışa Aktarma** | html-to-image / JSON BigInt | Modern web API | PNG, SVG, DOT ve BigInt uyumlu JSON serileştirme |

---

## 1.1 Adres Temsili ve 64-bit Kısıtları (BigInt Architecture)
- x86-64 mimarisinde adresler tam 64-bit (veya canonical 48-bit sanal adres uzayı) olabilmektedir.
- JavaScript varsayılan `Number` tipi 53-bit (`Number.MAX_SAFE_INTEGER = 0x1fffffffffffff`) tamsayı hassasiyetine sahiptir.
- Bu nedenle mimaride adresler `bigint` olarak temsil edilir ve yardımcı formatlayıcılar (`toHex(addr: bigint): string`) kullanılır.
- JSON formatında BigInt yerel olarak desteklenmediği için `/src/core/utils/json.ts` modülü ile `BigInt` değerlerini hex veya string olarak işleyen özel serileştirici (`JSON.stringify` replacer ve `JSON.parse` reviver) kullanılır.

---

## 2. Geliştirme Ortamı ve Komutlar

- **Kurulum:**
  ```bash
  npm install
  ```
- **Geliştirme Sunucusu (Dev Server):**
  ```bash
  npm run dev
  ```
- **Birim Testleri Çalıştırma:**
  ```bash
  npm run test
  # veya watch modu:
  npx vitest
  ```
- **Test Kapsama Raporu (Coverage):**
  ```bash
  npm run test:coverage
  ```
- **Tip Kontrolü & Lint:**
  ```bash
  npx tsc --noEmit
  npm run lint
  ```
- **Üretim Derlemesi (Build):**
  ```bash
  npm run build
  ```

---

## 3. Paket Bağımlılıkları Matrisi

### Temel Bağımlılıklar (Dependencies)
- `react`, `react-dom`: Arayüz omurgası
- `@xyflow/react`: React Flow grafik tuvali
- `dagre`, `@types/dagre`: Otomatik CFG ve Call Graph yerleşimi
- `zustand`: Global UI durumu, aktif seçimler ve etiketler
- `lucide-react`: Modern tersine mühendislik UI ikonları
- `clsx`, `tailwind-merge`: Dinamik sınıf yönetimi
- `html-to-image`: Grafik tuvalini PNG/SVG olarak dışa aktarma

### Geliştirme Bağımlılıkları (DevDependencies)
- `typescript`: Sıkı tip denetimi
- `vite`: Build aracı
- `@vitejs/plugin-react`: Vite React desteği
- `vitest`, `@vitest/coverage-v8`: Birim testler ve %90+ coverage analizi
- `tailwindcss`, `postcss`, `autoprefixer`: CSS stilleri
- `@types/node`, `@types/react`, `@types/react-dom`

---

## 4. Teknik Kısıtlamalar ve Standartlar
- **Strict TypeScript:** `noImplicitAny: true`, `strictNullChecks: true`, `strict: true`.
- **Sıfır Sunucu Gereksinimi:** Uygulama saf Static SPA (Single Page Application) olarak dağıtılabilir olmalıdır.
- **Yalıtılmış Çekirdek:** `/src/core` içerisinde hiçbir React, DOM veya UI kütüphanesi import edilemez. Saf veri girişleri alır, saf analiz nesneleri döndürür.
- **Büyük Girdi Performansı:** 5000+ komutluk girdiler için gereksiz yeniden render'lar (re-render) engellenmeli, grafik düğümleri sanallaştırılmış veya komut listesi daraltılabilir (foldable) olmalıdır.
