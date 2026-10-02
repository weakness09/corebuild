## 1. Mevcut Durum
- **Aşama:** M1-M5 Tüm Aşamalar, Test 1-3 Doğrulamaları ve Görsel Düzeltmeler Tamamlandı.
- **Test ve Kapsama:** 50 testin tamamı geçti (%100 başarı), `/src/core` analiz motoru için **%93.19** satır kapsama oranı elde edildi (≥ %90 DoD hedefi aşıldı).
- **Performans:** 5000+ komutluk stres testi 118ms sürede tamamlandı (<1000ms hedefi aşıldı).
- **Derleme & Tip Denetimi:** TypeScript strict mode (`tsc --noEmit`) ve Vite üretim derlemesi (`npm run build`) 0 hata ile 1.73 saniyede tamamlandı.
- **Canlı Sunucu:** Vite geliştirme sunucusu `http://localhost:5173/` üzerinde kesintisiz çalışıyor.

---

## 2. Son Yapılan Görsel ve Mantıksal Düzeltmeler
1. **Handle Noktalarının Sınıra Sabitlenmesi & Görünmezlik (`opacity: 0`):**
   - Blok kapsayıcılarına `relative` eklendi; handle noktaları `top: -4px`, `bottom: -4px` ve `right: -4px` konumlarına taşındı.
   - Tüm handle'lar `opacity: 0` ve `pointer-events-none` yapılarak `jl/jmp` satırları üzerindeki görsel kirlilik ve çakışmalar tamamen kaldırıldı. Kenarlar doğrudan kutu sınırına temizce kenetlenir.
2. **Geri Kenar Etiketinin Dikey Segment Ortasına Taşınması:**
   - `CustomEdges.tsx` içinde geri kenar etiketi (`döngü geri kenarı`) düğüm kenarı yerine, grafiğin sağındaki dikey dönüş segmentinin tam ortasına (`trackX`, `(sourceY + targetY) / 2`) taşındı. Hiçbir düğümle çakışmaz.
3. **Assembly Paneli Başlığının Tek Satıra Sabitlenmesi:**
   - `AssemblyEditor.tsx` başlık alanı tek satıra sabitlendi (`whitespace-nowrap`), komut sayısı kompakt rozet (`Assembly [16]`) olarak gösterildi; `[Bayt]`, `[Yükle]`, `[Analiz/Düzenle]` butonları kompaktlaştırıldı.
4. **Çerçeve Rozetinde "0 bayt" Standardı:**
   - `NodeDetailsPanel.tsx` ve `CallGraphNode.tsx` içinde çerçeve boyutu 0 olduğunda `0x0 bayt` yerine daima `"0 bayt"` yazıldı.
5. **Test 2 (AT&T) ve Test 3 (Call Graph / Özyineleme / Tail Call) Doğrulaması:**
   - `parser.ts` içinde adresi olmayan sembol başlıkları (`.L2:`, `.L3:`, `loop_fn:`) için adres atama hatası düzeltildi ve sembol adres çözümlemesi için post-pass eklendi.
   - Test 2 (AT&T syntax döngü) için `loops.test.ts` testi eklendi ve doğrulandı.
   - Test 3 (Call Graph: çağrı, recursion, tail call, leaf fonksiyon) için `functions.test.ts` testi eklendi ve doğrulandı.
   - Uygulama üst çubuğundaki hızlı örneklere `Test 1 (sum)`, `Test 2 (AT&T)` ve `Test 3 (Call Graph)` butonları entegre edildi.

---

## 3. Sıradaki Adım
- Kullanıcı onayına sunum ve M5 dışa aktarma (PNG, SVG, DOT, BigInt JSON) / etiketleme özelliklerinin canlı kullanımı.
