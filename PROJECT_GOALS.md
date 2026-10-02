# Project Goals - CodeRebuild

## 1. Vizyon
> **"Derlenmiş kodun assembly'sinden okunabilir mantık çıkar."**

CodeRebuild, x86-64 assembly çıktısını (objdump, Intel, AT&T, GDB) tarayıcı üzerinde tamamen yerel (istemci tarafında) analiz eden, fonksiyonları, kontrol akış grafiğini (CFG), döngüleri, koşulları ve fonksiyon çağrı grafiğini (Call Graph) görselleştiren ve etkileşimli etiketleme (annotation) sağlayan kıdemli bir tersine mühendislik aracıdır.

---

## 2. Ölçülebilir Hedefler & Başarı Kriterleri
- **Ayrıştırma (Parser):** 3 ana giriş biçimini (`objdump -d -M intel`, düz Intel sözdizimi, AT&T sözdizimi normalize edilmiş, GDB `disassemble`) %100 kararlılıkla çökertecek girdi olmadan ayrıştırmak; bilinmeyen satırları `UnknownInstruction` olarak işaretleyip analiz akışını bozmamak.
- **Performans:** 5.000+ assembly komutundan oluşan girdilerin analizi ve CFG oluşturulması **1 saniyenin altında** tamamlanmalıdır.
- **Test Kapsamı:** `/src/core` analiz motoru için **%90+ satır (line) test kapsamı**.
- **Kullanılabilirlik & Gizlilik:** Sunucusuz, sıfır ağ veri aktarımı (100% istemci tarafı / offline-ready).
- **Etkileşim:** Assembly satırı ve CFG blokları arasında çift yönlü odaklanma/vurgulama (bidirectional highlighting); kullanıcı tanımlı etiketlerin (labels) tüm görünüm ve analizlerde (CFG, Call Graph, koşul yorumları) anında yer değiştirmesi.

---

## 3. Kapsam Dışı (Out of Scope)
- x86-64 kod emülasyonu veya sanal çalıştırma (CPU emulation/execution).
- Decompiler kalitesinde tam C/C++ kaynak kodu üretimi (yalnızca blok bazlı insan-okur koşul ve basit sözde kod / pseudo-code üretilecektir).
- Gelişmiş koruma ve obfuscation çözme (unpacking, virtualization deobfuscation, opaque predicates).
- ARM, AArch64, MIPS, RISC-V veya 32-bit x86 (ilk sürümde yalnızca 64-bit x86-64 hedeflenmektedir).

---

## 4. Aşamalar (Milestones) ve Bitti (Definition of Done) Tanımları

### Milestone 1: Parser & Komut Sınıflandırma
- **Tanım:** Farklı kaynaklardan gelen x86-64 assembly metinlerini `Instruction` ve `Operand` AST yapılarına dönüştürme ve sınıflandırma.
- **Bitti Kriteri (DoD):**
  - `objdump -d -M intel`, düz Intel, AT&T (Intel'e normalize edilen) ve GDB çıktıları hatasız ayrıştırılır.
  - Komutlar sınıflandırılır (`ARITH`, `LOGIC`, `MOVE`, `STACK`, `COMPARE`, `COND_JUMP`, `UNCOND_JUMP`, `CALL`, `RET` vb.).
  - Register alias eşlemesi (rax/eax/ax/al) ve prefix (`rep`, `lock`, `endbr64`) ayrıştırması yapılır.
  - Ayrıştırılamayan satırlar `UnknownInstruction` üretir ve uygulamayı çökertmez.
  - Fixture birim testleri geçer ve test coverage %90+ olur.

### Milestone 2: Basic Block & CFG Motoru
- **Tanım:** Leader algoritması ile temel blokları (Basic Blocks) ve kenarları (Edges) oluşturma; kontrol akışı analizi.
- **Bitti Kriteri (DoD):**
  - Leader kümesi tespiti doğru çalışır (giriş, atlama hedefleri, atlama/ret sonrası komutlar).
  - Kenar türleri (`fallthrough`, `jump_taken`, `jump_not_taken`, `unconditional`, `indirect`) doğru atanır.
  - Basit switch tablosu sezgisel analizi ve unresolved indirect blok desteği.
  - Dominator ağacı ve geri kenar (back-edge) analizi ile doğal döngüler (natural loops) ve loop header'lar tespit edilir.
  - Dead code (erişilemeyen bloklar) tespit edilir ve bayraklandırılır.
  - if/else, while, for, switch fixture testleri geçer.

### Milestone 3: Fonksiyon Analizi & Call Graph
- **Tanım:** Fonksiyon sınırlarının tespiti, çağrı ilişkileri ve program genelindeki Call Graph inşası.
- **Bitti Kriteri (DoD):**
  - Sembol etiketleri, `call` hedefleri, prolog kalıpları (`push rbp; mov rbp, rsp`) ve `ret` sonrası hizalama ile fonksiyonlar ayrıştırılır.
  - Fonksiyonlar arası `call`, `tail call` (dışarıya `jmp`) ve özyineleme (recursion - fact/fib) tespit edilir.
  - Noreturn fonksiyonlar (`exit`, `abort`, `__stack_chk_fail`) tanımlanarak CFG blok sonlandırma uygulanır.
  - Tüm programın Call Graph veri yapısı oluşturulur.
  - Yığın çerçeve boyutu (`sub rsp, N`) ve System V ABI argüman adayları (`rdi`, `rsi`, `rdx`, `rcx`, `r8`, `r9`) tespit edilir.

### Milestone 4: Kullanıcı Arayüzü (UI) & Görselleştirme
- **Tanım:** Modern, performanslı 3 bölmeli web arayüzü ve React Flow + Dagre grafik entegrasyonu.
- **Bitti Kriteri (DoD):**
  - Sol bölme: Assembly giriş/yapıştırma, dosya yükleme (`.s`, `.asm`, `.txt`), satır numaraları, sözdizimi renklendirme.
  - Orta bölme: Sekmeli tuval (CFG ve Call Graph), Dagre hiyerarşik yerleşim, renklendirilmiş kenarlar (yeşil taken, kırmızı not taken, mavi unconditional, kesikli mor call, gri ret).
  - Giriş, çıkış, döngü ve dead blokların belirgin görselleştirilmesi; minimap, zoom, fit view, blok daraltma/genişletme.
  - Sağ bölme: Seçili blok detayları, koşul yorumlaması (`eğer eax <= 5 ise L'ye atla`), sözde kod özeti, değişkenler.
  - Assembly satırı ile CFG bloğu arasında çift yönlü senkronize seçim.
  - Call Graph düğümüne çift tıklayınca o fonksiyonun CFG sekmesine geçiş.
  - Karanlık / Aydınlık tema desteği.

### Milestone 5: Kullanıcı Etiketleri (Annotations), Dışa Aktarma & Entegrasyon
- **Tanım:** Kullanıcı tanımlı etiketleme sistemi, kalıcılık ve çeşitli formatlarda dışa aktarma yeteneği.
- **Bitti Kriteri (DoD):**
  - Fonksiyon, blok, değişken ve adres seviyesinde etiketleme (`Label` sistemi).
  - Assembly görünümünde, grafik düğümlerinde ve koşul yorumlarında otomatik etiket ikamesi (`call 0x401136` -> `call parse_input`).
  - Satıra sağ tık bağlam menüsü ve `L` klavye kısayolu ile hızlı etiketleme.
  - Çakışma kontrolü ve toplu etiket yönetim paneli (arama, filtreleme, silme).
  - localStorage kalıcılığı ve SHA-256 girdi doğrulamalı JSON içe/dışa aktarma; Undo/Redo desteği.
  - Görsel ve veri dışa aktarma: PNG, SVG, Graphviz DOT ve JSON formatları.
  - 5000+ komutluk stres testi ve uçtan uca doğrulama.
