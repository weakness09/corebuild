# Project Brief - CodeRebuild

CodeRebuild, x86-64 assembly metinlerini (`objdump`, Intel, AT&T ve GDB formatları) tarayıcı içinde tamamen yerel (istemci tarafında) olarak ayrıştırıp analiz eden, fonksiyon sınırlarını, kontrol akış grafiğini (CFG), döngü yapılarını ve çağrı grafiğini (Call Graph) hiyerarşik olarak görselleştiren ve assembly komutlarından insan-okur koşullu mantık ve sözde kod (pseudo-code) çıkaran etkileşimli bir tersine mühendislik web aracıdır.

## Kapsam
- x86-64 Intel ve AT&T sözdizimlerini ayrıştırma, komut sınıflandırma ve register alias çözümleme.
- Leader yöntemi ile temel blok (basic block) ve CFG inşası, dominator ağacı tabanlı döngü tespiti, dead code tespiti.
- Fonksiyon sınırlarının tespiti, özyineleme (recursion) ve tail-call çözümleme, Call Graph oluşturma.
- Yığın değişkenleri (`var_XX`) ve argüman (`arg1..argN`) sezgisel tespiti, `cmp/test` + atlama kalıplarından insan-okur koşul analizi.
- React Flow + Dagre ile etkileşimli CFG ve Call Graph görselleştirme, 3 bölmeli modern arayüz, çift yönlü seçim senkronizasyonu.
- Kullanıcı tanımlı etiketleme (annotations) sistemi, anında sembol yer değiştirme, localStorage kalıcılığı, SHA-256 doğrulama, JSON/PNG/SVG/DOT dışa aktarma.
- Çekirdek analiz motorunun (`/src/core`) UI bağımsız, saf TypeScript fonksiyonları olarak geliştirilmesi ve %90+ test kapsamı.

## Kapsam Dışı
- x86-64 komut emülasyonu, register/hafıza sanal çalıştırması veya hata ayıklama (CPU emulation).
- Tam C/C++ kaynak kod derleme/decompile işlemi (yalnızca blok seviyesinde sözde kod ve koşul özeti).
- Obfuscation/packers çözme (opaque predicates, control flow flattening).
- ARM, AArch64, RISC-V, MIPS ve 32-bit x86 mimarileri (ilk sürümde yalnızca 64-bit x86-64).
