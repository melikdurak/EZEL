const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

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
          // GÜNCELLENDİ: İkon adresi yeni siteye göre düzeltildi
          icon: "https://melikdurak.github.io/EZEL/images/icon-192x192.png", 
        }
      },
      topic: "all",
    };

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


