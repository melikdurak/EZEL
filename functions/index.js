const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// YENİ ANİ EKLENDİĞİNDE OTOMATİK ÇALIŞAN FONKSİYON
// Bu fonksiyon, "anilar" koleksiyonuna yeni bir belge eklendiğinde tetiklenir.
exports.yeniAniBildirimiGonder = functions.region("europe-west1")
  .firestore.document("anilar/{aniId}")
  .onCreate(async (snap, context) => {
    
    // 1. Yeni eklenen anının verilerini al
    const yeniAni = snap.data();
    
    // 2. Diğer kullanıcılara gönderilecek bildirim içeriğini oluştur
    const payload = {
      notification: {
        title: `${yeniAni.authorEmail} yeni bir anı ekledi!`,
        body: yeniAni.text.substring(0, 100) + "...", // Anının ilk 100 karakterini göster
      },
      webpush: { // Web (PWA) bildirimleri için ikon bilgisi
        notification: {
          icon: "https://imaginative-concha-c1f448.netlify.app/images/icon-192x192.png", // Sitenizin güncel linki
        }
      },
      topic: "all", // "all" kanalına abone olan herkese gönder
    };

    // 3. Bildirimi gönder
    try {
      console.log("Bildirim gönderiliyor:", payload);
      await admin.messaging().send(payload);
      console.log("Bildirim 'all' kanalına başarıyla gönderildi.");
      return null;
    } catch (error) {
      console.error("Otomatik bildirim gönderilirken hata oluştu:", error);
      return null;
    }
  });

