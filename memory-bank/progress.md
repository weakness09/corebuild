# Progress - CodeRebuild

## 1. Tamamlananlar (Completed)
- [x] **Adım 0: Proje Başlatma & Dokümantasyon Hazırlığı**
  - [x] `PROJECT_GOALS.md` oluşturuldu (vizyon, ölçülebilir hedefler, aşama DoD tanımları, kapsam dışı hedefler).
  - [x] Memory Bank yapısı kuruldu (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md`).
  - [x] Uygulama Planı (Implementation Plan) hazırlandı.

---

## 2. Aşamalar (Milestones)

- [x] **M1 - Parser & Komut Sınıflandırma**
  - [x] Vite + TypeScript + Vitest temel yapılandırması
  - [x] Instruction ve Operand arayüzleri (`/src/core/parser/types.ts`)
  - [x] Register alias haritası (`/src/core/parser/registers.ts`)
  - [x] Komut sınıflandırıcı (`/src/core/parser/classifier.ts`)
  - [x] AT&T -> Intel normalizer (`/src/core/parser/normalizer.ts`)
  - [x] objdump / GDB / raw assembly ayrıştırıcısı (`/src/core/parser/parser.ts`)
  - [x] UnknownInstruction hata toleransı
  - [x] Post-pass sembolik etiket adresi çözümleme (.L2, .L3, fonksiyon adları)
  - [x] Yeni fixture'lar: -O2 inline, fonksiyon işaretçisi, bozuk satırlar (`tests/fixtures/`)
  - [x] Parser birim testleri ve fixture'lar (%94+ coverage)

- [x] **M2 - Basic Block & CFG Motoru**
  - [x] Leader algoritması (`/src/core/cfg/leader.ts`)
  - [x] Temel blok inşası (`/src/core/cfg/blockBuilder.ts`)
  - [x] Switch table çözümleme & Unresolved indirect düğümleri (`/src/core/cfg/switchResolver.ts`)
  - [x] İnsan-okur koşul yorumlama motoru (`/src/core/analysis/conditionInterpreter.ts`)
  - [x] Kenar (Edge) analizi ve `conditionDescription` eşlemesi (`/src/core/cfg/edgeBuilder.ts`)
  - [x] Dominator analizi (`/src/core/analysis/dominators.ts`)
  - [x] Doğal döngü (Natural loop) ve loop header tespiti (`/src/core/analysis/loops.ts`)
  - [x] İç içe ve irreducible döngü testleri (`tests/analysis/loops.test.ts`)
  - [x] Dead code (erişilemeyen bloklar) tespiti (`/src/core/analysis/deadCode.ts`)
  - [x] Stres testi: 5000+ komutluk analiz 118ms sürede tamamlandı (<1sn hedefi tutturuldu)
  - [x] @dagrejs/dagre paket standardizasyonu
  - [x] BigInt JSON serileştirici / çözücü (`/src/core/utils/json.ts`)

- [x] **M3 - Fonksiyon Tespiti & Call Graph**
  - [x] Sembol başlığı, call hedefi, prolog ve ret sonrası analiz (`/src/core/functions/detector.ts`)
  - [x] Noreturn fonksiyon listesi ve blok sonlandırma (`/src/core/parser/noreturn.ts`)
  - [x] Program seviyesi Call Graph oluşturma (`/src/core/functions/callGraph.ts`)
  - [x] Tail call ve özyineleme (recursion) tespiti
  - [x] Yığın çerçevesi boyutu (`sub rsp, N`), yığın değişkenleri (`var_XX`) ve System V ABI argüman register tespiti (`/src/core/functions/frameAnalysis.ts`)
  - [x] Blok bazlı sözde kod üretimi (`/src/core/analysis/pseudoCode.ts`)
  - [x] Fonksiyon & Call Graph testleri (recursion, indirect calls, tail calls)

- [x] **M4 - Kullanıcı Arayüzü (UI) & Grafik Görselleştirme**
  - [x] Zustand store (`/src/ui/store/useAnalysisStore.ts`)
  - [x] 3 bölmeli modern düzen (`/src/ui/components/layout/AppLayout.tsx`)
  - [x] Sol bölme: Assembly giriş, dosya yükleme, satır senkronizasyonu (`/src/ui/components/editor/AssemblyEditor.tsx`)
  - [x] Orta bölme: React Flow + @dagrejs/dagre yerleşim motoru (`CFGView.tsx`, `CallGraphView.tsx`)
  - [x] Özel CFG düğüm bileşeni (`BasicBlockNode.tsx`), renklendirilmiş kenarlar (`CustomEdges.tsx`)
  - [x] Sağ bölme: Blok detayları, koşul yorumlaması, sözde kod, yığın değişkenleri (`/src/ui/components/details/NodeDetailsPanel.tsx`)
  - [x] Çift yönlü satır/blok seçimi ve odaklama senkronizasyonu
  - [x] Koyu/Açık tema ve hazır disassembly örnekleri (Test 1, Test 2, Test 3, Switch)

- [x] **M5 - Etiketleme Sistemi, Dışa Aktarma & Nihai Doğrulama**
  - [x] Etiket veri modeli ve doğrulama motoru (`/src/core/labels/labelManager.ts`)
  - [x] Çakışma önleme (aynı ad iki hedefe verilemez) ve filtreleme
  - [x] Komut ve metinlerde otomatik etiket ikamesi (`/src/core/labels/substitutor.ts`)
  - [x] localStorage kalıcılığı, SHA-256 girdi doğrulaması ve JSON içe/dışa aktarma (`/src/core/labels/storage.ts`)
  - [x] Graphviz DOT dışa aktarıcısı (`/src/core/export/dotExport.ts`)
  - [x] PNG, SVG, DOT ve BigInt JSON dışa aktarma menüsü (`/src/ui/components/export/ExportMenu.tsx`)
  - [x] 50 adet otomatik birim/entegrasyon testi, %93.19 satır kapsama oranı, 0 hata ile üretim derlemesi (dist/)

- [x] **Son Görsel Düzeltmeler & Test 1-3 Doğrulamaları:**
  - [x] 1. Handle noktaları `bottom: -4px` ve `top: -4px` ile düğüm sınırına sabitlendi.
  - [x] 2. Handle noktaları `opacity: 0` yapılarak komut metinlerinin üstüne binmesi engellendi; kenarlar doğrudan kutu sınırına kenetlenir.
  - [x] 3. Geri kenar etiketi dikey dönüş segmentinin tam ortasına (`trackX`, `(sourceY + targetY)/2`) taşındı, düğüm sınırlarıyla çakışması önlendi.
  - [x] 4. Assembly paneli başlığı tek satıra sabitlendi, komut sayısı kompakt rozet (`Assembly [16]`) yapıldı.
  - [x] 5. Çerçeve rozetinde `0x0 bayt` yerine daima `"0 bayt"` yazıldı.
  - [x] 6. Test 1 (sum for döngüsü), Test 2 (AT&T syntax loop) ve Test 3 (Call Graph, recursion, tail call, leaf function) birim testleri ile %100 doğrulandı; üst çubuk butonları eklendi.

---

## 3. Bilinen Hatalar ve Kısıtlamalar (Known Issues)
- Aktif hata bulunmamaktadır. Tüm testler ve derleme başarıyla tamamlanmıştır.
- İlk sürümde x86-64 hedeflenmiştir; 32-bit x86 ve ARM mimarileri gelecek sürümler için planlanmaktadır.
