// HTML elementlerine referanslar
const loginSection = document.getElementById('login-section');
const appContent = document.getElementById('app-content');
const userInfo = document.getElementById('user-info');
const userEmailDisplay = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const subscribeButton = document.getElementById('subscribe-button');
const loginForm = document.getElementById('login-form');
const addMemoryForm = document.getElementById('add-memory-form');
const addMemoryFormContainer = document.getElementById('add-memory-form-container');
const memoryText = document.getElementById('memory-text');
const memoryPhotoInput = document.getElementById('memory-photo');
const memoriesList = document.getElementById('memories-list');
const menuIcon = document.getElementById('menu-icon');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// GÜNCELLENDİ: Fonksiyonlar doğru bölge belirtilerek başlatılıyor
const functions = firebase.app().functions('europe-west1');
let unsubscribeMemories = null;

function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

menuIcon.addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);

sidebar.addEventListener('click', (e) => {
    if (e.target.classList.contains('sidebar-link')) {
        const page = e.target.dataset.page;
        if (page === 'home') {
            addMemoryFormContainer.style.display = 'block';
            memoriesList.style.display = 'none';
        } else {
            addMemoryFormContainer.style.display = 'none';
            memoriesList.style.display = 'block';
            fetchMemories(page);
        }
        closeSidebar();
    }
});

function fetchMemories(category) {
    if (unsubscribeMemories) {
        unsubscribeMemories();
    }
    unsubscribeMemories = db.collection("anilar")
        .where("category", "==", category)
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {
            memoriesList.innerHTML = `<h2>${category} Anıları</h2>`;
            if (snapshot.empty) {
                memoriesList.innerHTML += `<p>Bu kategoride henüz hiç anı eklenmemiş.</p>`;
                return;
            }
            snapshot.forEach(doc => {
                const memory = doc.data();
                const docId = doc.id;
                const currentUser = auth.currentUser;
                const memoryCard = document.createElement('div');
                memoryCard.className = 'memory-card';
                memoryCard.setAttribute('data-id', docId);
                const date = memory.createdAt ? new Date(memory.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'Tarih yok';
                const deleteButtonHTML = currentUser && currentUser.uid === memory.authorId ? `<button class="delete-button">Sil</button>` : '';
                const imageHTML = memory.imageUrl ? `<img src="${memory.imageUrl}" alt="Anı fotoğrafı" class="memory-image">` : '';
                const likes = memory.likes || [];
                const userHasLiked = currentUser && likes.includes(currentUser.uid);
                const likeCount = likes.length;
                const likeButtonClass = userHasLiked ? 'like-button liked' : 'like-button';
                let commentsHTML = '';
                const comments = memory.comments || [];
                comments.forEach(comment => {
                    commentsHTML += `<div class="comment"><small>${comment.authorEmail}:</small> ${comment.text}</div>`;
                });
                memoryCard.innerHTML = `
                    ${deleteButtonHTML} ${imageHTML}
                    <p>${memory.text.replace(/\n/g, '<br>')}</p>
                    <small>Yazan: ${memory.authorEmail} | Tarih: ${date}</small>
                    <div class="actions-container"><button class="${likeButtonClass}"><span class="heart">❤</span><span>${likeCount}</span></button></div>
                    <div class="comments-section">${commentsHTML}<form class="comment-form"><input type="text" placeholder="Yorum ekle..." required><button type="submit">Gönder</button></form></div>
                `;
                memoriesList.appendChild(memoryCard);
            });
        }, error => {
            console.error("Firestore sorgu hatası:", error);
            memoriesList.innerHTML += `<p style="color:red;">Anılar yüklenirken bir hata oluştu. Lütfen Firestore indeksini kontrol edin. (Detaylar için konsola bakın)</p>`;
        });
}

// BİLDİRİM FONKSİYONU - EN DOĞRU VE MODERN HALİYLE GÜNCELLENDİ
async function setupPushNotifications() {
    console.log("Bildirim kurulumu başlatılıyor...");
    const messaging = firebase.messaging();
    
    try {
        await messaging.requestPermission();
        console.log('Bildirim izni başarıyla alındı.');

        const swRegistration = await navigator.serviceWorker.ready;
        const token = await messaging.getToken({ serviceWorkerRegistration: swRegistration });

        if (token) {
            console.log('Cihaz FCM Jetonu:', token);

            // Yeni ve doğru yöntem: Token'ı sunucuya Callable Function ile gönder
            const subscribe = functions.httpsCallable('subscribeTokenToTopic');
            await subscribe({ token: token, topic: 'all' });
            
            console.log("'all' kanalına abonelik isteği başarıyla gönderildi.");
            alert("Bildirimlere başarıyla abone oldunuz!");
        } else {
            throw new Error('Jeton alınamadı.');
        }

    } catch (err) {
        console.error('Bildirim kurulumu sırasında hata oluştu: ', err);
        alert("Bildirim izni veya abonelik alınamadı. Lütfen tarayıcı ayarlarınızı veya konsolu kontrol edin.");
    }

    messaging.onMessage((payload) => {
        console.log('Uygulama açıkken mesaj alındı: ', payload);
        alert('Yeni Bildirim: ' + payload.notification.title);
    });
}

subscribeButton.addEventListener('click', setupPushNotifications);

auth.onAuthStateChanged(user => {
    if (user) {
        loginSection.style.display = 'none';
        appContent.style.display = 'block';
        userInfo.style.display = 'flex';
        userEmailDisplay.textContent = user.email;
        addMemoryFormContainer.style.display = 'block';
        memoriesList.style.display = 'none';
    } else {
        loginSection.style.display = 'block';
        appContent.style.display = 'none';
        userInfo.style.display = 'none';
        if (unsubscribeMemories) unsubscribeMemories();
    }
});

addMemoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = memoryText.value;
    const file = memoryPhotoInput.files[0];
    const currentUser = auth.currentUser;
    const category = document.getElementById('memory-category').value;
    if (!text.trim() || !category || !currentUser) {
        alert("Lütfen anınızı yazıp bir kategori seçin.");
        return;
    }
    const submitButton = addMemoryForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Kaydediliyor...';
    if (!file) {
        saveMemory(text, null, currentUser, category, submitButton);
        return;
    }
    const filePath = `anilar/${currentUser.uid}/${Date.now()}-${file.name}`;
    const fileRef = storage.ref(filePath);
    const uploadTask = fileRef.put(file);
    uploadTask.on('state_changed', null, error => {
        console.error("Fotoğraf yükleme hatası: ", error);
        submitButton.disabled = false;
        submitButton.textContent = 'Anıyı Kaydet';
    }, () => {
        uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
            saveMemory(text, downloadURL, currentUser, category, submitButton);
        });
    });
});

function saveMemory(text, imageUrl, user, category, button) {
    db.collection("anilar").add({
        text: text,
        imageUrl: imageUrl,
        authorEmail: user.email,
        authorId: user.uid,
        category: category,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: [],
        comments: []
    }).then(() => {
        addMemoryForm.reset();
        alert(`'${category}' kategorisine anınız başarıyla eklendi!`);
    }).catch(error => alert("Anı eklenirken hata: " + error))
      .finally(() => {
        button.disabled = false;
        button.textContent = 'Anıyı Kaydet';
    });
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password).catch(error => alert('Hata: ' + error.message));
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

memoriesList.addEventListener('click', (e) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (e.target.classList.contains('delete-button')) {
        if (!confirm("Bu anıyı silmek istediğinizden emin misiniz?")) return;
        const card = e.target.closest('.memory-card');
        db.collection("anilar").doc(card.dataset.id).delete();
    }
    const likeButton = e.target.closest('.like-button');
    if (likeButton) {
        const card = e.target.closest('.memory-card');
        const docId = card.dataset.id;
        const docRef = db.collection("anilar").doc(docId);
        if (likeButton.classList.contains('liked')) {
            docRef.update({
                likes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });
        } else {
            docRef.update({
                likes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        }
    }
});

memoriesList.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (e.target.classList.contains('comment-form')) {
        const input = e.target.querySelector('input');
        const commentText = input.value.trim();
        if (!commentText) return;
        const card = e.target.closest('.memory-card');
        const docId = card.dataset.id;
        const docRef = db.collection("anilar").doc(docId);
        const newComment = {
            authorEmail: currentUser.email,
            authorId: currentUser.uid,
            text: commentText,
            createdAt: new Date()
        };
        docRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        }).then(() => {
            e.target.reset();
        });
    }
});
