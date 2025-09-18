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

// ====================================================================
// ONESIGNAL & SUPABASE KURULUMU
// ====================================================================
const SUPABASE_URL = 'https://ispygaaxodrglbiqvrnd.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzcHlnYWF4b2RyZ2xiaXF2cm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODM0OTAsImV4cCI6MjA3Mzc1OTQ5MH0.CiUkn2W1xYtBZ_ypYP_Wc1IgJqXXyUCxGVwrE7e9GmA'; 
const ONESIGNAL_APP_ID = "267a50f0-fde6-4999-a344-65ff9818784f";

// OneSignal Kurulumu
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(function(OneSignal) {
  OneSignal.init({
    appId: ONESIGNAL_APP_ID,
  });
});

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================================================================
// KENAR MENÜ (SIDEBAR) KONTROLLERİ
// ====================================================================
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

// ====================================================================
// ANILARI GETİRME (SUPABASE İLE)
// ====================================================================
async function fetchMemories(category) {
    memoriesList.innerHTML = `<h2>${category} Anıları</h2>`;

    const { data: anilar, error } = await _supabase
        .from('anilar')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Anıları çekerken hata:", error);
        memoriesList.innerHTML += `<p style="color:red;">Anılar yüklenirken bir hata oluştu. Supabase RLS ayarlarını kontrol edin.</p>`;
        return;
    }

    if (anilar.length === 0) {
        memoriesList.innerHTML += `<p>Bu kategoride henüz hiç anı eklenmemiş.</p>`;
        return;
    }

    let memoriesHTML = '';
    const { data: { user } } = await _supabase.auth.getUser();

    for (const memory of anilar) {
        const date = new Date(memory.created_at).toLocaleString('tr-TR');
        const deleteButtonHTML = user && user.id === memory.authorId ? `<button class="delete-button" data-id="${memory.id}">Sil</button>` : '';
        const imageHTML = memory.imageUrl ? `<img src="${memory.imageUrl}" alt="Anı fotoğrafı" class="memory-image">` : '';
        
        memoriesHTML += `
            <div class="memory-card">
                ${deleteButtonHTML} ${imageHTML}
                <p>${memory.text.replace(/\n/g, '<br>')}</p>
                <small>Yazan: ${memory.authorEmail} | Tarih: ${date}</small>
            </div>
        `;
    }
    memoriesList.innerHTML += memoriesHTML;
}

// ====================================================================
// OTURUM YÖNETİMİ (SUPABASE İLE)
// ====================================================================
const handleAuthStateChange = (user) => {
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
    }
};

_supabase.auth.onAuthStateChange((event, session) => {
    handleAuthStateChange(session?.user ?? null);
});

// ====================================================================
// BİLDİRİMLERE ABONE OLMA (ONESIGNAL İLE)
// ====================================================================
subscribeButton.addEventListener('click', () => {
    OneSignalDeferred.push(function(OneSignal) {
        console.log('OneSignal bildirim izni isteniyor.');
        OneSignal.showSlidedownPrompt();
    });
});

// ====================================================================
// GİRİŞ, ÇIKIŞ VE ANİ EKLEME (SUPABASE İLE)
// ====================================================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Hata: ' + error.message);
    }
});

logoutButton.addEventListener('click', async () => {
    await _supabase.auth.signOut();
});

addMemoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = memoryText.value;
    const file = memoryPhotoInput.files[0];
    const { data: { user } } = await _supabase.auth.getUser();
    const category = document.getElementById('memory-category').value;

    if (!text.trim() || !category || !user) {
        alert("Lütfen anınızı yazıp bir kategori seçin.");
        return;
    }

    const submitButton = addMemoryForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Kaydediliyor...';
    
    let publicImageUrl = null;
    if (file) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await _supabase.storage.from('anilar-resimler').upload(filePath, file);

        if (uploadError) {
            console.error("Fotoğraf yükleme hatası:", uploadError);
            alert("Fotoğraf yüklenirken bir hata oluştu. Lütfen Supabase Storage ayarlarınızı kontrol edin.");
            submitButton.disabled = false;
            submitButton.textContent = 'Anıyı Kaydet';
            return;
        }
        
        const { data } = _supabase.storage.from('anilar-resimler').getPublicUrl(filePath);
        publicImageUrl = data.publicUrl;
    }
    
    const { error: insertError } = await _supabase
        .from('anilar')
        .insert([{ 
            text: text, 
            imageUrl: publicImageUrl, 
            authorId: user.id,
            authorEmail: user.email,
            category: category 
        }]);

    if (insertError) {
        console.error("Anı eklenirken hata:", insertError);
        alert("Anı eklenirken bir hata oluştu. Lütfen Supabase RLS ayarlarınızı kontrol edin.");
    } else {
        addMemoryForm.reset();
        alert(`'${category}' kategorisine anınız başarıyla eklendi!`);
        addMemoryFormContainer.style.display = 'none';
        memoriesList.style.display = 'block';
        fetchMemories(category);
    }
    
    submitButton.disabled = false;
    submitButton.textContent = 'Anıyı Kaydet';
});

// Anı silme işlevselliği
memoriesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-button')) {
        const memoryId = e.target.dataset.id;
        if (!confirm("Bu anıyı silmek istediğinizden emin misiniz?")) return;

        const { error } = await _supabase
            .from('anilar')
            .delete()
            .eq('id', memoryId);
        
        if (error) {
            console.error("Anı silinirken hata:", error);
            alert("Anı silinirken bir hata oluştu.");
        } else {
            e.target.closest('.memory-card').remove();
        }
    }
});
