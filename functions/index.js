const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true}); // CORS kütüphanesini etkinleştir

admin.initializeApp();

// YENİ GÜNCELLENMİŞ ABONELİK FONKSİYONU
exports.subscribeTokenToTopic = functions.region("europe-west1")
  .https.onRequest((req, res) => {
    // CORS isteğini işlemesi için fonksiyonu cors middleware'i ile sarmala
    cors(req, res, async () => {
      try {
        const { token, topic } = req.body.data; // Veriyi artık isteğin gövdesinden alıyoruz

        if (!token || !topic) {
          console.error("Token ve topic gerekli.");
          res.status(400).send({error: "Token ve topic gereklidir."});
          return;
        }

        await admin.messaging().subscribeToTopic(token, topic);
        
        console.log(`Token ${token} başarıyla ${topic} konusuna abone edildi.`);
        res.status(200).send({success: true, message: `Başarıyla ${topic} konusuna abone olundu.`});

      } catch (error) {
        console.error(`${req.body.data.topic} konusuna abone olurken hata oluştu:`, error);
        res.status(500).send({error: "Abonelik işlemi başarısız oldu."});
      }
    });
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



