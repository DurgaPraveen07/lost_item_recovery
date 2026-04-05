/**
 * CAMPUS LOST & FOUND - VERCEL SERVERLESS VERSION
 * Integrated with Supabase for real-time data and authentication.
 */

// 1. SUPABASE CONFIGURATION (HARDCODED FOR VERCEL)
const SUPABASE_URL = "https://fkikwbnnrvojvvdcdieg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraWt3Ym5ucnZvanZ2ZGNkaWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjUxMzksImV4cCI6MjA4ODU0MTEzOX0.FipeIG8H31yQdQYXy0xNEbOJ7KOtbC0fnLKSNMmIo7c";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});

// 2. ENVIRONMENT LOG
console.log('CampusFind loaded — ENV:', 
    window.location.hostname === 'localhost' ? 'LOCAL' : 'PRODUCTION'
);

// 3. STATE & GLOBALS
let currentItems = [];
let currentFilter = 'all';
let currentUser = JSON.parse(localStorage.getItem('diet_user')) || null;
let bannerBase64 = null;
let currentReceiptId = null;
let currentReceiptTimestamp = null;
let chatInterval = null; // Countdown timer interval

// Fix asset path for Vercel
const BANNER_PATH = 'banner.png';

// 4. INITIALIZATION
async function initApp() {
    checkAuth();
    await loadBanner();
    await fetchItems();
    await fetchStats();
    setupRealtimeItems();  // <-- Real-time live updates
}

// 5. AUTHENTICATION & SECURITY
function checkAuth() {
    if (!currentUser && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }
    
    if (currentUser) {
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) adminLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
        
        // Setup Live Features
        updateUnreadBadge();
        setupRealtimeMessages();
    }
}

function logout() {
    localStorage.removeItem('diet_user');
    window.location.href = 'login.html';
}

// 6. DASHBOARD & DATA FETCHING — uses Supabase directly for reliability
async function fetchItems() {
    try {
        const { data, error } = await _supabase
            .from('items')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        currentItems = data || [];
        renderItems(currentFilter);
    } catch (e) {
        console.error('Fetch error:', e);
        const container = document.getElementById('itemsContainer');
        if (container) container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error fetching database: ' + e.message + '</div>';
    }
}

// REAL-TIME SUBSCRIPTION — auto-refreshes items & stats on any DB change
function setupRealtimeItems() {
    _supabase
        .channel('public:items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async (payload) => {
            console.log('[Realtime] Items changed:', payload.eventType);
            await fetchItems();
            await fetchStats();
            if (payload.eventType === 'INSERT') {
                showToast('🔔 New item reported — list updated!', 2500);
            } else if (payload.eventType === 'UPDATE') {
                showToast('✅ An item was updated!', 2000);
            }
        })
        .subscribe((status) => {
            console.log('[Realtime] Items channel status:', status);
        });
}

function renderItems(filter) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let filtered = currentItems;
    if (filter === 'my_reports') {
        if (!currentUser) return;
        filtered = currentItems.filter(i => i.reporter_email === currentUser.email);
    } else if (filter !== 'all') {
        filtered = currentItems.filter(i => i.type === filter);
    }
    
    if(filtered.length === 0){
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: black;">No items found.</div>`;
        return;
    }

    filtered.forEach(item => {
        let iconClass = 'fas fa-box';
        if(item.category.includes('Electronics')) iconClass = 'fas fa-laptop';
        else if(item.category.includes('Stationery')) iconClass = 'fas fa-book';
        else if(item.category.includes('Accessories')) iconClass = 'fas fa-wallet';

        const card = document.createElement('div');
        card.className = 'item-card hover-lift';
        card.innerHTML = `
            <div class="item-status status-${item.type}">${item.type.toUpperCase()}</div>
            <div class="item-icon"><i class="${iconClass}"></i></div>
            <div class="item-details">
                <h4>${item.item_name} ${item.status === 'resolved' ? '<span style="color:var(--success-color); font-size:0.8rem; border:1px solid var(--success-color); border-radius:12px; padding:2px 8px; margin-left:10px;"><i class="fas fa-check"></i> RESOLVED</span>' : ''}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${item.location} • <i class="far fa-clock"></i> ${timeSince(item.timestamp || item.date_reported)}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button class="btn btn-outline" style="width:100%; justify-content:center;" onclick="viewDetails(${item.id})">View Details</button>
                ${(currentUser && item.user_id && item.user_id !== currentUser.id && item.status !== 'resolved') ? 
                    `<button class="btn btn-primary" style="width:100%; justify-content:center;" onclick='openMessageModal(${item.id})'><i class="fas fa-paper-plane"></i> Contact Owner</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function filterItems(type, element) {
    currentFilter = type;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    if (element) element.classList.add('active');
    renderItems(currentFilter);
}

// 7. ITEM DETAILS & RESOLUTION
function viewDetails(id) {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('detailTitle').innerText = item.item_name;
    const content = document.getElementById('detailContent');
    
    let html = `
        <p style="margin-bottom: 15px;"><strong style="color: #111;"><i class="fas fa-tag" style="width: 25px;"></i> Category:</strong><span style="float:right">${item.category}</span></p>
        <p style="margin-bottom: 15px;"><strong style="color: #111;"><i class="fas fa-map-marker-alt" style="width: 25px;"></i> ${item.type === 'lost' ? 'Last Seen' : 'Found At'}:</strong><span style="float:right">${item.location}</span></p>
        <p style="margin-bottom: 15px;"><strong style="color: #111;"><i class="far fa-calendar-alt" style="width: 25px;"></i> Date:</strong><span style="float:right">${item.date_reported || 'N/A'}</span></p>
        <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 20px 0;">
    `;
    
    if (item.type === 'lost') {
        html += `<strong style="color: #111;"><i class="fas fa-align-left" style="width: 25px;"></i> Description & Marks:</strong><p style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px;">${item.description || 'No specific description provided.'}</p>`;
    } else {
        html += `<strong style="color: #111;"><i class="fas fa-hand-holding" style="width: 25px;"></i> Handed Over To:</strong><p style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px;">${item.handed_over_to || 'Not specified'}</p>`;
    }

    if (item.image_url) {
        html += `<div style="margin-top: 20px; text-align: center;"><img src="${item.image_url}" style="max-width: 100%; border-radius: 12px; box-shadow: var(--classic-shadow); border: 2px solid var(--border-color);"></div>`;
    }

    if (currentUser && currentUser.email !== item.reporter_email && item.status !== 'resolved') {
        html += `<div style="margin-top: 20px; text-align: center;"><button class="btn btn-secondary slide-hover" onclick="openMessageModal(${item.id})"><i class="fas fa-shield-alt"></i> Access Secure Chat & Claim</button></div>`;
    } else if (currentUser && currentUser.email === item.reporter_email) {
        html += `<div style="margin-top: 20px; text-align: center; color: var(--success-color); font-weight: bold;"><i class="fas fa-check-circle"></i> This is your post.</div>`;
        if (item.status !== 'resolved') {
            html += `<div style="margin-top: 15px; text-align: center;"><button class="btn btn-primary" onclick="resolveItem(${item.id})"><i class="fas fa-flag-checkered"></i> Mark as Resolved (Claimed/Returned)</button></div>`;
        }
    }
    
    if (item.status === 'resolved') {
        html += `<div style="margin-top: 15px; text-align: center;"><button class="btn btn-outline" onclick="viewReceipt(${item.id}, '${item.resolved_timestamp}')"><i class="fas fa-file-invoice"></i> View Official Digital Receipt</button></div>`;
    }
    
    content.innerHTML = html;
    openModal('detailsModal');
}

async function resolveItem(itemId) {
    if(!confirm("Are you sure? A digital receipt will be generated.")) return;
    
    try {
        const resolvedTimestamp = new Date().toISOString();
        const { error } = await _supabase
            .from('items')
            .update({ status: 'resolved', resolved_timestamp: resolvedTimestamp })
            .eq('id', itemId);

        if (error) throw error;
        
        showToast("Success! The item is now marked as resolved.", true);
        closeModal('detailsModal');
        await fetchItems();
        viewReceipt(itemId, resolvedTimestamp);
    } catch (e) {
        console.error('Resolve error:', e);
        showToast(`Failed: ${e.message}`);
    }
}

function viewReceipt(itemId, timestampStr) {
    closeModal('detailsModal');
    const ts = timestampStr || new Date().toISOString();
    currentReceiptId = `REC-${ts.split('-').join('').slice(0,8)}-${itemId}`;
    currentReceiptTimestamp = ts;
    
    document.getElementById('receiptData').innerHTML = `
        <b>Receipt ID:</b> ${currentReceiptId}<br><br>
        <b>Timestamp:</b> ${new Date(ts).toLocaleString()}<br><br>
        <b>Action:</b> Official Handover Resolved<br><br>
        <b>Status:</b> CLOSED & CLEAR
    `;
    openModal('receiptModal');
}

// 8. REPORTING (SUBMISSION)
async function submitForm(event, modalId) {
    event.preventDefault();
    const form = event.target;
    const type = modalId === 'lostModal' ? 'lost' : 'found';
    const fileInput = form.querySelector('.file-input');
    let imageUrl = null;

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    // ── Image upload with hard 3-second timeout ──
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `items/${Date.now()}.${fileExt}`;

        try {
            const uploadPromise = _supabase.storage
                .from('item-images')
                .upload(filePath, file);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Upload timeout')), 3000)
            );

            const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

            if (!uploadError) {
                const { data: urlData } = _supabase.storage
                    .from('item-images')
                    .getPublicUrl(filePath);
                imageUrl = urlData?.publicUrl || null;
            }
        } catch (e) {
            console.warn('Image upload skipped:', e.message);
            imageUrl = null; // Continue without image
        }
    }

    // ── Build item payload ──
    let location = form.querySelector('.item-location').value.trim();
    let handedOverTo = type === 'found'
        ? (form.querySelector('.item-handover') ? form.querySelector('.item-handover').value : '')
        : '';
    if (handedOverTo === 'Security Office') location = 'Campus Security Vault';

    const statusEl = form.querySelector('.item-status');
    const itemData = {
        type:           type,
        item_name:      form.querySelector('.item-name').value.trim(),
        category:       form.querySelector('.item-category').value,
        date_reported:  form.querySelector('.item-date').value,
        location:       location,
        description:    type === 'lost'
                          ? (form.querySelector('.item-desc')?.value.trim() || '')
                          : '',
        handed_over_to: handedOverTo,
        status:         statusEl ? statusEl.value : 'open',
        reporter_email: currentUser.email,
        user_id:        currentUser.id,
        image_url:      imageUrl
    };

    try {
        // ── Insert directly to Supabase ──
        const { error } = await _supabase.from('items').insert([itemData]);
        if (error) throw error;

        showToast('✅ Report submitted successfully!', true);
        closeModal(modalId);
        form.reset();
        await fetchItems();
        await fetchStats();
    } catch (e) {
        console.error('Submission error:', e);
        showToast('❌ Error: ' + e.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

async function submitIdFound(event) {
    event.preventDefault();
    const rollQuery = document.getElementById('idRollNumber').value.trim().toUpperCase();
    const dropLocation = document.getElementById('idDropLocation').value.trim();
    
    const itemData = {
        type: 'found',
        item_name: `Student ID Card (${rollQuery})`,
        category: 'ID Cards',
        date_reported: new Date().toISOString().split('T')[0],
        location: dropLocation,
        description: `URGENT ID RECOVERY: Found student ID card for Roll Number ${rollQuery}.`,
        handed_over_to: dropLocation,
        reporter_email: currentUser.email,
        user_id: currentUser.id,
        status: 'open'
    };
    
    try {
        // Insert directly to Supabase — realtime will auto-refresh the list
        const { error } = await _supabase
            .from('items')
            .insert([itemData]);

        if (error) throw error;

        closeModal('idCardModal');
        showToast("ID logging successful!", true);
        await fetchItems();
        await fetchStats();
    } catch(e) {
        console.error('ID submission error:', e);
        showToast(`Error: ${e.message}`);
    }
}

// 9. MESSAGING SYSTEM (THREADED)
async function updateUnreadBadge() {
    if (!currentUser) return;
    try {
        const { count, error } = await _supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);

        if (error) throw error;
        const b = document.getElementById('msgBadge');
        if (b) {
            b.textContent = count;
            b.style.display = count > 0 ? 'block' : 'none';
        }
    } catch (e) {}
}

function openMessageModal(itemId) {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('msgItemId').value = item.id;
    document.getElementById('msgReceiverId').value = item.user_id;
    document.getElementById('msgModalItemName').textContent = `Contacting Owner of: ${item.item_name}`;
    document.getElementById('msgTextarea').value = '';
    
    closeModal('detailsModal');
    openModal('messageModal');
}

async function handleSendMessage(event) {
    event.preventDefault();
    const itemId = document.getElementById('msgItemId').value;
    const receiverId = document.getElementById('msgReceiverId').value;
    const msg = document.getElementById('msgTextarea').value.trim();
    
    if (!msg) return;

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                message: msg
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to send");
        
        closeModal('messageModal');
        showToast("Session started! Check your inbox.", true);
        openInbox();
    } catch (e) {
        showToast(e.message);
    }
}

async function openInbox() {
    openModal('inboxModal');
    showThreadList();
}

async function showThreadList() {
    const list = document.getElementById('threadList');
    const view = document.getElementById('conversationView');
    list.style.display = 'flex';
    view.style.display = 'none';
    list.innerHTML = '<p style="text-align:center; padding:20px;">Fetching chats...</p>';

    try {
        const { data: messages, error } = await _supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const threads = {};
        messages.forEach(m => {
            if (!threads[m.item_id]) {
                const item = currentItems.find(it => it.id == m.item_id) || { item_name: "Unknown Item" };
                threads[m.item_id] = {
                    item_id: m.item_id,
                    item_name: item.item_name,
                    last_msg: m,
                    unread: m.receiver_id === currentUser.id && !m.is_read
                };
            }
        });

        const threadArr = Object.values(threads);
        if (threadArr.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:40px; color:#999;">No messages yet.</p>';
            return;
        }

        list.innerHTML = '';
        threadArr.forEach(t => {
            const div = document.createElement('div');
            div.className = `thread-item ${t.unread ? 'unread' : ''}`;
            div.onclick = () => openThread(t.item_id);
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${t.item_name}</strong>
                    <small>${timeSince(t.last_msg.created_at)}</small>
                </div>
                <div style="font-size:0.85rem; color:#666; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${t.last_msg.message}
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = '<p style="color:red; text-align:center;">Inbox Error.</p>';
    }
}

async function openThread(itemId) {
    if (chatInterval) clearInterval(chatInterval);
    const list = document.getElementById('threadList');
    const view = document.getElementById('conversationView');
    const chat = document.getElementById('chatMessages');
    
    list.style.display = 'none';
    view.style.display = 'block';
    chat.innerHTML = '<p style="text-align:center; padding:20px;">Fetching secure session...</p>';

    try {
        // Fetch thread via API for strict security check
        const response = await fetch(`/api/messages?item_id=${itemId}&user_id=${currentUser.id}`);
        const messages = await response.json();

        if (messages.length === 0) {
            chat.innerHTML = '<p style="color:#999; text-align:center;">No messages found.</p>';
            return;
        }

        // Determine receiver for reply
        const firstMsg = messages[0];
        const otherId = firstMsg.sender_id === currentUser.id ? firstMsg.receiver_id : firstMsg.sender_id;
        
        document.getElementById('replyItemId').value = itemId;
        document.getElementById('replyReceiverId').value = otherId;

        // Session Timer Logic
        const sessionRes = await fetch(`/api/chat/session_info?item_id=${itemId}&user1=${currentUser.id}&user2=${otherId}`);
        const sessionInfo = await sessionRes.json();
        
        chat.innerHTML = '';
        
        if (sessionInfo.start_time) {
            const timerContainer = document.createElement('div');
            timerContainer.id = 'sessionTimer';
            timerContainer.className = 'chat-timer';
            chat.appendChild(timerContainer);
            
            startCountdown(sessionInfo.start_time, sessionInfo.server_time);
        }

        // PDF Proof Button
        const pdfBtn = document.createElement('button');
        pdfBtn.className = 'btn btn-outline';
        pdfBtn.style = 'width: 100%; margin-bottom: 10px; font-size: 0.8rem; justify-content: center;';
        pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Proof of Discovery (PDF)';
        pdfBtn.onclick = () => downloadClaimProof(itemId);
        chat.appendChild(pdfBtn);

        messages.forEach(m => {
            const sent = m.sender_id === currentUser.id;
            const b = document.createElement('div');
            b.className = `chat-bubble ${sent ? 'sent' : 'received'}`;
            b.innerHTML = `
                <span class="chat-bubble-label">${sent ? 'You' : 'Anonymous User'}</span>
                ${m.message} 
                <span class="chat-time">${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            `;
            chat.appendChild(b);
        });
        chat.scrollTop = chat.scrollHeight;

        await _supabase.from('messages').update({ is_read: true }).eq('item_id', itemId).eq('receiver_id', currentUser.id);
        updateUnreadBadge();
    } catch (e) {
        chat.innerHTML = '<p style="color:red;">Communication error. Please retry.</p>';
    }
}

function startCountdown(startTimeStr, serverTimeStr) {
    const startTime = new Date(startTimeStr).getTime();
    const serverTime = new Date(serverTimeStr).getTime();
    const offset = Date.now() - serverTime; // Local vs Server offset

    const update = () => {
        const now = Date.now() - offset;
        const elapsed = (now - startTime) / 1000;
        const remaining = 3600 - elapsed;
        
        const timerEl = document.getElementById('sessionTimer');
        const form = document.getElementById('replyForm');
        
        if (remaining <= 0) {
            if (timerEl) timerEl.innerHTML = '<i class="fas fa-clock"></i> SESSION EXPIRED';
            if (form) {
                form.style.display = 'none';
                if (!document.getElementById('expiredNotice')) {
                    const notice = document.createElement('div');
                    notice.id = 'expiredNotice';
                    notice.className = 'chat-disabled-notice';
                    notice.innerText = "This session has expired. Access blocked.";
                    form.parentNode.appendChild(notice);
                }
            }
            clearInterval(chatInterval);
            return;
        }

        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        if (timerEl) {
            timerEl.innerHTML = `<i class="fas fa-clock"></i> Expires in: ${mins}m ${secs}s`;
        }
    };

    update();
    chatInterval = setInterval(update, 1000);
}

async function handleReply(event) {
    event.preventDefault();
    const itemId = document.getElementById('replyItemId').value;
    const receiverId = document.getElementById('replyReceiverId').value;
    const input = document.getElementById('replyInput');
    const txt = input.value.trim();
    if (!txt) return;

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                message: txt
            })
        });
        
        const result = await response.json();
        if (!response.ok) {
            if (result.error === 'CHAT_EXPIRED') {
                showToast("Chat link broken: Session Expired", false);
                openThread(itemId); // Refresh to lock UI
            } else {
                showToast(result.error);
            }
            return;
        }
        
        input.value = '';
        openThread(itemId);
    } catch (e) {
        showToast("Connection lost.");
    }
}

async function downloadClaimProof(itemId) {
    const item = currentItems.find(i => i.id == itemId);
    if (!item) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    if (bannerBase64) doc.addImage(bannerBase64, 'PNG', 10, 10, 190, 30);
    
    doc.setFontSize(22);
    doc.setTextColor(139, 0, 0);
    doc.text("Official Proof of Item Discovery", 105, 55, {align: 'center'});
    
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Unique Reference ID: CLM-${Date.now()}-${itemId}`, 20, 70);
    doc.text(`Verification Date: ${new Date().toLocaleString()}`, 20, 75);
    
    doc.setLineWidth(0.5);
    doc.line(20, 80, 190, 80);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 32, 76);
    doc.text("Item Particulars", 20, 95);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Item Name: ${item.item_name}`, 25, 105);
    doc.text(`Category: ${item.category}`, 25, 115);
    doc.text(`Location found/lost: ${item.location}`, 25, 125);
    doc.text(`Date Reported: ${item.date_reported}`, 25, 135);
    
    doc.setFontSize(10);
    doc.italic = true;
    doc.text("Note: This document serves as digital proof of the handover session initiation.", 20, 160);
    doc.text("Official verification by campus security is required for final release.", 20, 165);
    
    doc.save(`Claim_Proof_${item.item_name.replace(/\s+/g, '_')}.pdf`);
    showToast("Proof document generated!", true);
}

function setupRealtimeMessages() {
    _supabase.channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.receiver_id === currentUser.id) {
            showToast("💬 New message received!", 5000);
            updateUnreadBadge();
            if (document.getElementById('inboxModal').style.display === 'block') {
                if (document.getElementById('conversationView').style.display === 'block' && payload.new.item_id == document.getElementById('replyItemId').value) {
                    openThread(payload.new.item_id);
                } else {
                    showThreadList();
                }
            }
        }
    }).subscribe();
}

// 10. ADMIN DASHBOARD — stats computed from local currentItems for speed
async function fetchStats() {
    try {
        // Use already-fetched items if available, else query Supabase
        let items = currentItems;
        if (!items || items.length === 0) {
            const { data, error } = await _supabase.from('items').select('*');
            if (error) throw error;
            items = data || [];
        }

        const lostCount = items.filter(i => i.type === 'lost').length;
        const foundCount = items.filter(i => i.type === 'found').length;
        const recoveredCount = items.filter(i => i.status === 'resolved').length;

        // Avg recovery time
        let totalHours = 0;
        const resolvedWithTimes = items.filter(i => i.status === 'resolved' && i.resolved_timestamp && i.timestamp);
        resolvedWithTimes.forEach(item => {
            try {
                const start = new Date(item.timestamp);
                const end = new Date(item.resolved_timestamp);
                totalHours += (end - start) / 3600000;
            } catch {}
        });
        const avgHours = resolvedWithTimes.length ? Math.round(totalHours / resolvedWithTimes.length) : 0;

        if (document.getElementById('lostCount')) document.getElementById('lostCount').innerText = lostCount;
        if (document.getElementById('foundCount')) document.getElementById('foundCount').innerText = foundCount;
        if (document.getElementById('recoveredCount')) document.getElementById('recoveredCount').innerText = recoveredCount;
        if (document.getElementById('avgRecoveryTime')) document.getElementById('avgRecoveryTime').innerText = avgHours + 'h';
    } catch (e) {
        console.error('Stats error:', e);
    }
}

async function renderAdminUsers() {
    const tb = document.getElementById('registeredUsersTable');
    if(!tb) return;
    tb.innerHTML = '<tr><td colspan="6" style="text-align: center;">Syncing with directory...</td></tr>';
    
    try {
        const { data: users, error } = await _supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        tb.innerHTML = '';
        (users || []).forEach(u => {
            tb.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <td style="padding: 10px;">${u.name || 'Anonymous'}</td>
                    <td style="padding: 10px;">${u.roll || '-'}</td>
                    <td style="padding: 10px;">${u.email}</td>
                    <td style="padding: 10px;">${u.branch || '-'}</td>
                    <td style="padding: 10px;">${u.year || '-'}</td>
                    <td style="padding: 10px;">${u.gender || '-'}</td>
                </tr>
            `;
        });
        const countEl = document.getElementById('totalUsersCount');
        if (countEl) countEl.textContent = `Total: ${(users || []).length} registered users`;
    } catch (e) {
        tb.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Directory offline: ' + e.message + '</td></tr>';
    }
}

async function renderAdminMessages() {
    const feed = document.getElementById('adminMessagesFeed');
    if(!feed) return;
    feed.innerHTML = '<p style="text-align: center;">Fetching logs...</p>';
    
    try {
        const response = await fetch(`/api/messages?user_id=${currentUser.id}`);
        const msgs = await response.json();
        feed.innerHTML = '';
        msgs.forEach(m => {
            feed.innerHTML += `
                <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid var(--primary-color);">
                    <p style="font-size: 0.85rem; color:#666;">${new Date(m.created_at).toLocaleString()}</p>
                    <p>${m.message}</p>
                </div>
            `;
        });
    } catch (e) {}
}

async function searchReceipt() {
    const q = document.getElementById('adminReceiptSearch').value.trim();
    const res = document.getElementById('adminReceiptResult');
    if (!q) return;

    try {
        const id = q.split('-').pop();
        const { data: item, error } = await _supabase.from('items').select('*').eq('id', id).single();
        res.style.display = 'block';
        if (error || !item || item.status !== 'resolved') {
            res.innerHTML = '<p style="color:red;">Record not found or item not yet resolved.</p>';
            return;
        }
        res.innerHTML = `
            <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
                <p><strong>Item:</strong> ${item.item_name}</p>
                <p><strong>Resolved:</strong> ${new Date(item.resolved_timestamp).toLocaleString()}</p>
                <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="downloadReceipt()">Regenerate Receipt</button>
            </div>
        `;
        currentReceiptId = q;
        currentReceiptTimestamp = item.resolved_timestamp;
    } catch (e) {
        res.innerHTML = '<p style="color:red;">Search failed: ' + e.message + '</p>';
    }
}

// 11. PROFILE MANAGEMENT
function openProfile() {
    if(!currentUser) return;
    document.getElementById('dispName').innerText = currentUser.name || '-';
    document.getElementById('dispEmail').innerText = currentUser.email || '-';
    document.getElementById('dispRoll').innerText = currentUser.roll || '-';
    document.getElementById('dispBranch').innerText = currentUser.branch || '-';
    document.getElementById('dispYear').innerText = currentUser.year || '-';
    
    // Show display view, hide edit view
    toggleProfileEdit(false);
    openModal('profileModal');
}

function toggleProfileEdit(showEdit) {
    const displayView = document.getElementById('profileDisplay');
    const editView = document.getElementById('profileEdit');
    if (!displayView || !editView) return;
    
    if (showEdit) {
        displayView.style.display = 'none';
        editView.style.display = 'block';
        // Pre-fill edit form with current user data
        if (document.getElementById('profName')) document.getElementById('profName').value = currentUser.name || '';
        if (document.getElementById('profMobile')) document.getElementById('profMobile').value = currentUser.mobile || '';
        if (document.getElementById('profRoll')) document.getElementById('profRoll').value = currentUser.roll || '';
        if (document.getElementById('profBranch')) document.getElementById('profBranch').value = currentUser.branch || '';
        if (document.getElementById('profSection')) document.getElementById('profSection').value = currentUser.section || '';
        if (document.getElementById('profYear')) document.getElementById('profYear').value = currentUser.year || '';
        if (document.getElementById('profGender')) document.getElementById('profGender').value = currentUser.gender || '';
        if (document.getElementById('profEmail')) document.getElementById('profEmail').value = currentUser.email || '';
        if (document.getElementById('profPassword')) document.getElementById('profPassword').value = '';
    } else {
        displayView.style.display = 'block';
        editView.style.display = 'none';
    }
}

// Keep old function name as alias for compatibility
function switchProfileTab(tab) {
    toggleProfileEdit(tab === 'edit');
}

async function saveProfile(event) {
    if (event) event.preventDefault();

    const nameEl = document.getElementById('profName');
    const mobileEl = document.getElementById('profMobile');
    const rollEl = document.getElementById('profRoll');
    const branchEl = document.getElementById('profBranch');
    const sectionEl = document.getElementById('profSection');
    const yearEl = document.getElementById('profYear');
    const genderEl = document.getElementById('profGender');
    const passwordEl = document.getElementById('profPassword');

    const changes = {
        name: nameEl ? nameEl.value.trim() : currentUser.name,
        mobile: mobileEl ? mobileEl.value.trim() : currentUser.mobile,
        roll: rollEl ? rollEl.value.trim() : currentUser.roll,
        branch: branchEl ? branchEl.value : currentUser.branch,
        section: sectionEl ? sectionEl.value.trim() : currentUser.section,
        year: yearEl ? yearEl.value : currentUser.year,
        gender: genderEl ? genderEl.value : currentUser.gender,
    };

    // Only update password if a new one was entered
    if (passwordEl && passwordEl.value.trim()) {
        changes.password = passwordEl.value.trim();
    }
    
    const updated = { ...currentUser, ...changes };

    const saveBtn = document.querySelector('#profileForm button[type="submit"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        // Save directly to Supabase profiles table — no Flask backend needed
        const { error: sbError } = await _supabase
            .from('profiles')
            .upsert(updated, { onConflict: 'id' });
        
        if (sbError) throw new Error(sbError.message);

        currentUser = updated;
        localStorage.setItem('diet_user', JSON.stringify(currentUser));
        showToast('✅ Profile saved successfully!', true);
        openProfile();
    } catch (e) {
        console.error('Profile save error:', e);
        showToast(`❌ Profile update failed: ${e.message}`);
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes'; }
    }
}

// 12. UTILS
function showToast(msg, duration = 3000) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

function openModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.add('show');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.remove('show');
}

function timeSince(date) {
    if(!date) return "long ago";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let i = seconds / 31536000;
    if (i > 1) return Math.floor(i) + "y";
    i = seconds / 2592000;
    if (i > 1) return Math.floor(i) + "mo";
    i = seconds / 86400;
    if (i > 1) return Math.floor(i) + "d";
    i = seconds / 3600;
    if (i > 1) return Math.floor(i) + "h";
    i = seconds / 60;
    if (i > 1) return Math.floor(i) + "m";
    return Math.floor(seconds) + "s";
}

async function loadBanner() {
    try {
        const response = await fetch(BANNER_PATH);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        bannerBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
        console.log("Banner image loaded successfully via local path.");
    } catch (error) {
        console.warn('Failed to load local banner image, using BANNER_BASE64 fallback:', error.message);
        // Fallback to BANNER_BASE64 from banner_data.js if available
        if (typeof BANNER_BASE64 !== 'undefined' && BANNER_BASE64) {
            bannerBase64 = BANNER_BASE64;
            console.log("Banner image loaded successfully via Base64 fallback.");
        } else {
            console.error('CRITICAL: No banner data available (local or base64)!');
        }
    }
}

async function downloadReceipt() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (bannerBase64) doc.addImage(bannerBase64, 'PNG', 10, 10, 190, 30);
    doc.setFontSize(18);
    doc.text("Official Recovery Receipt", 105, 50, {align: 'center'});
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${currentReceiptId}`, 20, 70);
    doc.text(`Timestamp: ${new Date(currentReceiptTimestamp).toLocaleString()}`, 20, 80);
    doc.text("Action: Security Verified Handover", 20, 90);
    doc.save(`${currentReceiptId}.pdf`);
}

// 13. ADMIN TOGGLE & ITEMS DATA TABLE
let _allItemsForTable = [];

function toggleAdmin(show) {
    const main = document.getElementById('mainApp');
    const admin = document.getElementById('adminDashboard');
    if (!main || !admin) return;

    const showAdmin = (show === true) || (show === undefined && admin.style.display === 'none');
    main.style.display  = showAdmin ? 'none'  : 'flex';
    admin.style.display = showAdmin ? 'flex'  : 'none';

    if (showAdmin) {
        renderAdminUsers();
        renderAdminMessages();
        renderItemsTable();
    }
}

async function renderItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#777;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const { data: items, error } = await _supabase
            .from('items')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        _allItemsForTable = items || [];
        _renderTableRows(_allItemsForTable);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">Error: ${e.message}</td></tr>`;
    }
}

function _renderTableRows(items) {
    const tbody = document.getElementById('itemsTableBody');
    const countEl = document.getElementById('itemsTableCount');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#777;">No items found.</td></tr>';
        if (countEl) countEl.textContent = '';
        return;
    }

    const typeColors  = { lost: '#8B0000', found: '#1a7a4a' };
    const statusColors = { open: '#e67e22', resolved: '#27ae60' };

    tbody.innerHTML = items.map((item, idx) => `
        <tr style="border-bottom:1px solid rgba(0,0,0,0.06); background:${idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(247,211,125,0.2)'}; transition:background 0.2s;"
            onmouseover="this.style.background='rgba(139,0,0,0.06)'" onmouseout="this.style.background='${idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(247,211,125,0.2)'}'">
            <td style="padding:10px 8px; font-weight:bold; color:#555; white-space:nowrap;">#${item.id}</td>
            <td style="padding:10px 8px;">
                <span style="background:${typeColors[item.type] || '#555'}; color:white; padding:3px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                    ${item.type || '-'}
                </span>
            </td>
            <td style="padding:10px 8px; font-weight:600; color:#222; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.item_name}">${item.item_name || '-'}</td>
            <td style="padding:10px 8px; color:#444;">${item.category || '-'}</td>
            <td style="padding:10px 8px; color:#444; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.location}">${item.location || '-'}</td>
            <td style="padding:10px 8px; color:#555; white-space:nowrap;">${item.date_reported || new Date(item.timestamp).toLocaleDateString()}</td>
            <td style="padding:10px 8px; color:#666; font-size:0.85rem; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.reporter_email}">${item.reporter_email || '-'}</td>
            <td style="padding:10px 8px;">
                <span style="background:${statusColors[item.status] || '#999'}22; color:${statusColors[item.status] || '#999'}; border:1px solid ${statusColors[item.status] || '#999'}40; padding:3px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; text-transform:uppercase;">
                    ${item.status || 'open'}
                </span>
            </td>
            <td style="padding:10px 8px; white-space:nowrap;">
                <button onclick="viewDetails(${item.id})" style="background:none; border:1px solid #457b9d; color:#457b9d; padding:4px 10px; border-radius:12px; cursor:pointer; font-size:0.8rem; margin-right:4px;" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${item.status !== 'resolved' ? `
                <button onclick="resolveItemFromTable(${item.id})" style="background:none; border:1px solid #27ae60; color:#27ae60; padding:4px 10px; border-radius:12px; cursor:pointer; font-size:0.8rem;" title="Mark Resolved">
                    <i class="fas fa-check"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');

    if (countEl) countEl.textContent = `Showing ${items.length} of ${_allItemsForTable.length} total items`;
}

function filterItemsTable() {
    const search  = (document.getElementById('itemsTableSearch')?.value || '').toLowerCase();
    const typeF   = document.getElementById('itemsTableTypeFilter')?.value || 'all';
    const statusF = document.getElementById('itemsTableStatusFilter')?.value || 'all';

    const filtered = _allItemsForTable.filter(item => {
        const matchType   = typeF   === 'all' || item.type   === typeF;
        const matchStatus = statusF === 'all' || item.status === statusF;
        const matchSearch = !search
            || (item.item_name   || '').toLowerCase().includes(search)
            || (item.location    || '').toLowerCase().includes(search)
            || (item.category    || '').toLowerCase().includes(search)
            || (item.reporter_email || '').toLowerCase().includes(search)
            || (item.description || '').toLowerCase().includes(search);
        return matchType && matchStatus && matchSearch;
    });

    _renderTableRows(filtered);
}

async function resolveItemFromTable(itemId) {
    if (!confirm('Mark this item as resolved?')) return;
    try {
        const ts = new Date().toISOString();
        const { error } = await _supabase
            .from('items')
            .update({ status: 'resolved', resolved_timestamp: ts })
            .eq('id', itemId);
        if (error) throw error;
        showToast('✅ Item marked as resolved!', true);
        await renderItemsTable();
        await fetchItems();
        await fetchStats();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

// 14. GLOBAL EXPORTS
window.filterItems          = filterItems;
window.viewDetails          = viewDetails;
window.resolveItem          = resolveItem;
window.viewReceipt          = viewReceipt;
window.submitForm           = submitForm;
window.submitIdFound        = submitIdFound;
window.openInbox            = openInbox;
window.openThread           = openThread;
window.handleReply          = handleReply;
window.openMessageModal     = openMessageModal;
window.handleSendMessage    = handleSendMessage;
window.openModal            = openModal;
window.closeModal           = closeModal;
window.toggleAdmin          = toggleAdmin;
window.logout               = logout;
window.openProfile          = openProfile;
window.toggleProfileEdit    = toggleProfileEdit;
window.switchProfileTab     = switchProfileTab;
window.saveProfile          = saveProfile;
window.downloadReceipt      = downloadReceipt;
window.searchReceipt        = searchReceipt;
window.showThreadList       = showThreadList;
window.renderItemsTable     = renderItemsTable;
window.filterItemsTable     = filterItemsTable;
window.resolveItemFromTable = resolveItemFromTable;

// Run Init
initApp();
