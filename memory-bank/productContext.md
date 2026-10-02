# Product Context - CodeRebuild

## Neden Var?
Tersine mühendislik, güvenlik denetimleri, kötü amaçlı yazılım analizi ve CTF (Capture The Flag) yarışmalarında araştırmacılar sıklıkla objdump, GDB veya derleyici çıktılarından elde edilen x86-64 assembly metinleriyle karşılaşırlar. IDA Pro veya Ghidra gibi kapsamlı tersine mühendislik araçları ağır, lisans gerektiren veya yerel kurulum gerektiren platformlardır. Ayrıca sadece bir assembly parçasını veya fonksiyonunu hızlıca görselleştirip, döngülerini ve dallanmalarını anlamak, koşulları insan dilinde okumak ve notlar almak için hafif, anında açılan ve veriyi hiçbir sunucuya göndermeyen güvenli bir web aracına ihtiyaç duyulmaktadır.

CodeRebuild, bu boşluğu doldurmak için geliştirilmiştir: hafif, tarayıcıda çalışan, sıfır kurulum gerektiren ve saniyeler içinde zengin kontrol akış grafikleri üreten bir analiz workbench'idir.

## Hedef Kullanıcı Kitlesi
1. **Güvenlik Araştırmacıları ve Kötü Amaçlı Yazılım Analistleri:** Şüpheli assembly bloklarının kontrol akışını ve fonksiyon çağrılarını izlemek isteyenler.
2. **CTF Oyuncuları ve Tersine Mühendisler:** İkili dosyalardan kopyalanan disassembly metinlerini hızlıca görselleştirmek ve çözmek isteyenler.
3. **Sistem Programcıları ve Derleyici Geliştiricileri:** C/C++/Rust kodunun derleyici tarafından nasıl optimize edildiğini (`-O0` vs `-O2`), döngülerin ve inline çağrıların durumunu inceleyenler.
4. **Bilgisayar Bilimleri Öğrencileri ve Eğitmenleri:** x86-64 mimarisinde dallanma, yığın çerçevesi ve fonksiyon mekanizmasını öğrenen ve öğretenler.

## Temel Kullanıcı Senaryoları (User Workflows)
1. **Hızlı Disassembly İnceleme:**
   - Kullanıcı terminalden `objdump -d -M intel binary` veya GDB çıktısını panoya kopyalar.
   - CodeRebuild'e yapıştırır veya `.s` dosyasını sürükleyip bırakır.
   - Araç fonksiyonları ve temel blokları otomatik ayrıştırır, seçilen fonksiyonun CFG'sini ve programın Call Graph'ını çizer.

2. **Dallanma ve Koşul Mantığını Anlama:**
   - Kullanıcı karmaşık bir if/else veya döngü bloğuna tıklar.
   - Sağ detay panelinde `cmp eax, 5` ve `jle` komutlarının `eğer eax <= 5 ise L'ye atla` şeklinde açıklandığını görür.
   - Döngü başlıklarını (loop header) ve geri kenarları (back-edge) renkli vurgularla anında ayırt eder.

3. **Etiketleme ve Mantıksal Haritalama (Annotation):**
   - Kullanıcı `sub_401136` fonksiyonunun `calculate_checksum` olduğunu anlar ve `L` kısayolu ile etiketler.
   - Bu etiket anında tüm komutlarda, call graph düğümlerinde ve koşul açıklamalarında güncellenir.
   - Yığın değişkeni `[rbp-0x14]` için `counter` etiketi verilir; tüm referanslar `counter` olarak okunur.
   - Etiketler localStorage'da saklanır ve takım arkadaşlarıyla paylaşmak üzere SHA-256 imzalı JSON olarak dışa aktarılır.

4. **Raporlama ve Dokümantasyon:**
   - Kullanıcı analiz ettiği CFG'yi veya Call Graph'ı PNG, SVG, Graphviz DOT veya JSON formatında dışa aktarıp raporlarına ekler.
