const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// YENİ GÜNCELLENMİŞ ABONELİK FONKSİYONU (onCall ile)
exports.subscribeTokenToTopic = functions.region("europe-west1")
  .https.onCall(async (data, context) => {
    const { token, topic } = data;

    if (!token || !topic) {
      throw new functions.https.HttpsError('invalid-argument', 'Token ve topic parametreleri eksik.');
    }

    try {
      await admin.messaging().subscribeToTopic(token, topic);
      console.log(`Token ${token} başarıyla ${topic} konusuna abone edildi.`);
      return { success: true, message: `Başarıyla ${topic} konusuna abone olundu.` };
    } catch (error) {
      console.error(`${topic} konusuna abone olurken hata oluştu:`, error);
      throw new functions.https.HttpsError('internal', 'Abonelik işlemi başarısız oldu.');
    }
  });


// YENİ ANİ EKLENDİĞİNDE OTOMATİK ÇALIŞAN FONKSİYON (Değişiklik yok)
exports.yeniAniBildirimiGonder = functions.region("europe-west1")
  .firestore.document("anilar/{aniId}")
  .onCreate(async (snap, context) => {
    const yeniAni = snap.data();
    const payload = {
      notification: {
        title: `${yeniAni.authorEmail} yeni bir anı ekledi!`,
        body: yeniAni.text.substring(0, 100) + "...",
      },
      webpush: {
        notification: {
          icon: "https://melikdurak.github.io/EZEL/images/icon-192x192.png",
        }
      },
      topic: "all",
    };
    try {
      await admin.messaging().send(payload);
      console.log("Bildirim 'all' kanalına başarıyla gönderildi.");
      return null;
    } catch (error) {
      console.error("Otomatik bildirim gönderilirken hata oluştu:", error);
      return null;
    }
  });
